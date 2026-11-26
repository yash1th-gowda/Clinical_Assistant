import nodemailer from "nodemailer";

let cachedTransporter = null;

export function getEmailTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number.parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP configuration is missing. Set SMTP_USER and SMTP_PASS.");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...(port === 587 ? { requireTLS: true } : {}),
    // Keep certificate verification enabled; never accept arbitrary TLS certificates.
  });

  return cachedTransporter;
}

export async function sendEmail({ to, subject, html }) {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED === "false") {
    return { skipped: true, reason: "Notifications disabled" };
  }
  if (!to) {
    return { skipped: true, reason: "No recipient email" };
  }

  try {
    const from =
      process.env.SMTP_FROM || "Smart Care Assistant <no-reply@smartcare.com>";
    const transporter = getEmailTransporter();
    const info = await transporter.sendMail({ from, to, subject, html });
    return { messageId: info.messageId, success: true };
  } catch (error) {
    // Avoid logging recipient addresses, message content, or provider response data.
    console.error("Email delivery failed:", error.code || "UNKNOWN", error.message);
    return {
      success: false,
      skipped: true,
      errorCode: error.code || "EMAIL_DELIVERY_FAILED",
    };
  }
}
