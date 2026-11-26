import { Router } from "express";
import { verifyJwt, requireDoctor } from "../middlewares/auth.middleware.js";
import {
  checkPatientADR,
  checkPrescriptionADR,
  getDoctorADRAlerts,
  updateADRAlertStatus,
  getADRStatistics,
} from "../controllers/adr.controllers.js";

const router = Router();

// ADR analysis and alert management are doctor-only operations.
router.use(verifyJwt, requireDoctor);

router.post("/check/patient/:patientId", checkPatientADR);
router.post("/check/prescription", checkPrescriptionADR);
router.get("/alerts", getDoctorADRAlerts);
// Keep PUT for compatibility with clients using the original endpoint.
router.put("/alerts/:alertId/status", updateADRAlertStatus);
router.get("/statistics", getADRStatistics);

export default router;
