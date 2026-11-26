import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ADRDetectionService } from "../services/adrDetectionService.js";
import { NotificationService } from "../services/notificationService.js";
import { ADRAlert } from "../models/adrAlerts.models.js";
import { Patient } from "../models/patient.models.js";
import { Doctor } from "../models/doctor.models.js";

const ALERT_STATUSES = ["pending", "reviewed", "resolved", "dismissed"];
const MAX_PAGE_SIZE = 100;

const assertValidObjectId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Valid ${label} is required`);
  }
};

// Support either side of the existing patient-doctor relationship fields.
const assertDoctorOwnsPatient = async (doctorId, patientId) => {
  const [patient, doctor] = await Promise.all([
    Patient.findById(patientId).select("_id doctorId"),
    Doctor.findById(doctorId).select("patients"),
  ]);

  if (!patient) throw new ApiError(404, "Patient not found");

  const assignedByPatient = patient.doctorId?.toString() === doctorId.toString();
  const assignedByDoctor = doctor?.patients?.some(
    (id) => id.toString() === patientId.toString()
  );

  if (!assignedByPatient && !assignedByDoctor) {
    throw new ApiError(403, "You are not assigned to this patient");
  }
};

const validateMedications = (medications) => {
  if (
    !Array.isArray(medications) ||
    medications.length === 0 ||
    medications.some(
      (medication) =>
        !medication ||
        typeof medication.name !== "string" ||
        !medication.name.trim()
    )
  ) {
    throw new ApiError(400, "A non-empty medications array with a name for each item is required");
  }
};

/**
 * Check ADR for a patient assigned to the authenticated doctor.
 */
export const checkPatientADR = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { medications = [] } = req.body;

  assertValidObjectId(patientId, "patient ID");
  if (!Array.isArray(medications)) {
    throw new ApiError(400, "Medications must be an array");
  }
  if (medications.length > 100) {
    throw new ApiError(400, "A maximum of 100 medications can be checked at once");
  }
  if (medications.some((medication) => !medication || typeof medication.name !== "string" || !medication.name.trim())) {
    throw new ApiError(400, "Each medication must include a name");
  }

  await assertDoctorOwnsPatient(req.user._id, patientId);
  const adrResults = await ADRDetectionService.detectADR(patientId, medications);

  res.status(200).json(
    new ApiResponse(200, adrResults, "ADR analysis completed successfully")
  );
});

/**
 * Check a proposed prescription before it is issued.
 */
export const checkPrescriptionADR = asyncHandler(async (req, res) => {
  const { patientId, medications } = req.body;
  const doctorId = req.user._id;

  assertValidObjectId(patientId, "patient ID");
  validateMedications(medications);
  if (medications.length > 100) {
    throw new ApiError(400, "A maximum of 100 medications can be checked at once");
  }

  await assertDoctorOwnsPatient(doctorId, patientId);
  const adrResults = await ADRDetectionService.detectADR(patientId, medications);

  if (adrResults.riskLevel === "high") {
    await createADRAlert(patientId, doctorId, adrResults);
    await sendADRNotifications(patientId, doctorId, adrResults);
  }

  res.status(200).json(
    new ApiResponse(200, adrResults, "Prescription ADR analysis completed")
  );
});

/**
 * Get paginated ADR alerts belonging to the authenticated doctor.
 */
export const getDoctorADRAlerts = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const page = Number.parseInt(req.query.page, 10) || 1;
  const requestedLimit = Number.parseInt(req.query.limit, 10) || 20;

  if (status && !ALERT_STATUSES.includes(status)) {
    throw new ApiError(400, "Invalid alert status");
  }
  if (page < 1 || requestedLimit < 1) {
    throw new ApiError(400, "Page and limit must be positive integers");
  }

  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);
  const query = { doctorId: req.user._id };
  if (status) query.status = status;

  const [alerts, total] = await Promise.all([
    ADRAlert.find(query)
      .populate("patientId", "fullname email phone")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit),
    ADRAlert.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        alerts,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
          totalAlerts: total,
        },
      },
      "ADR alerts retrieved successfully"
    )
  );
});

/**
 * Update an alert only when it belongs to the authenticated doctor.
 */
export const updateADRAlertStatus = asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { status, notes } = req.body;
  const doctorId = req.user._id;

  assertValidObjectId(alertId, "alert ID");
  if (status !== undefined && !ALERT_STATUSES.includes(status)) {
    throw new ApiError(400, "Invalid alert status");
  }
  if (notes !== undefined && (typeof notes !== "string" || notes.length > 2000)) {
    throw new ApiError(400, "Notes must be text no longer than 2000 characters");
  }
  if (status === undefined && notes === undefined) {
    throw new ApiError(400, "Provide a status or notes value to update");
  }

  const alert = await ADRAlert.findOne({ _id: alertId, doctorId });
  if (!alert) {
    throw new ApiError(404, "ADR alert not found");
  }

  if (status !== undefined) alert.status = status;
  if (notes !== undefined) alert.doctorNotes = notes;
  await alert.save();

  res.status(200).json(
    new ApiResponse(200, alert, "ADR alert updated successfully")
  );
});

/**
 * Get aggregate ADR statistics for the authenticated doctor.
 */
export const getADRStatistics = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const stats = await ADRAlert.aggregate([
    { $match: { doctorId: req.user._id } },
    {
      $group: {
        _id: null,
        totalAlerts: { $sum: 1 },
        highRiskAlerts: {
          $sum: { $cond: [{ $eq: ["$riskLevel", "high"] }, 1, 0] },
        },
        moderateRiskAlerts: {
          $sum: { $cond: [{ $eq: ["$riskLevel", "moderate"] }, 1, 0] },
        },
        resolvedAlerts: {
          $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
        },
        recentAlerts: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, 1, 0],
          },
        },
      },
    },
  ]);

  const result = stats[0] || {
    totalAlerts: 0,
    highRiskAlerts: 0,
    moderateRiskAlerts: 0,
    resolvedAlerts: 0,
    recentAlerts: 0,
  };

  res.status(200).json(
    new ApiResponse(200, result, "ADR statistics retrieved successfully")
  );
});

async function createADRAlert(patientId, doctorId, adrResults) {
  return ADRAlert.create({
    patientId,
    doctorId,
    riskLevel: adrResults.riskLevel,
    adrData: adrResults,
    status: "pending",
  });
}

async function sendADRNotifications(patientId, doctorId, adrResults) {
  try {
    const [doctor, patient] = await Promise.all([
      ADRDetectionService.getDoctorInfo(doctorId),
      ADRDetectionService.getPatientInfo(patientId),
    ]);

    if (!doctor || !patient) return;

    const notificationData = {
      doctor,
      patient,
      adrResults,
      timestamp: new Date(),
    };

    await Promise.allSettled([
      NotificationService.sendEmailAlert(notificationData),
      NotificationService.sendSMSAlert(notificationData),
      NotificationService.sendWhatsAppAlert(notificationData),
    ]);
  } catch (error) {
    // Notification delivery must not expose provider details to API clients.
    console.error("ADR notification delivery failed:", error.message);
  }
}
