/**
 * CampusFlow — Institutional Email Dispatcher & Magic Link Delivery Engine
 * lib/email/dispatcher.ts
 *
 * Implements:
 * 1. Formats institutional White & Navy Blue branded email for parent consent.
 * 2. Routes all system alerts to centralized test inbox: Barkhaaa5050@gmail.com.
 * 3. Prominently prints the raw Magic Link directly to the server terminal console
 *    for instant 1-click dev-testing.
 */

import nodemailer from "nodemailer";

export interface ParentEmailPayload {
  toEmail?: string;
  studentName: string;
  rollNumber: string;
  studentId: string;
  branch: string;
  hostelName: string;
  bookletType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  chargeableDays: number;
  destination: string;
  reason: string;
  quotaAlertFlag?: string | null;
  magicLinkUrl: string;
  className?: string | null;
  days?: string | null;
}

export const CENTRALIZED_TEST_EMAIL = "Barkhaaa5050@gmail.com";

export async function dispatchParentConsentEmail(payload: ParentEmailPayload): Promise<{
  success: boolean;
  recipient: string;
  magicLinkUrl: string;
  logOutput: string;
  error?: string;
}> {
  const recipient = payload.toEmail || CENTRALIZED_TEST_EMAIL;

  const terminalLog = `
╔════════════════════════════════════════════════════════════════════════════════╗
║                🏛️ CAMPUSFLOW — PARENT MAGIC LINK EMAIL DISPATCH                ║
╚════════════════════════════════════════════════════════════════════════════════╝
 📬 RECIPIENT INBOX : ${recipient}
 🎓 STUDENT NAME    : ${payload.studentName}
 🆔 ROLL / ID       : ${payload.rollNumber} / ${payload.studentId}
 🏛️ HOSTEL / BRANCH : ${payload.hostelName} · ${payload.branch}
${payload.className ? ` 🏫 CLASS           : ${payload.className}\n` : ""}${payload.days ? ` 🔢 DAYS            : ${payload.days}\n` : ""} 📋 BOOKLET TYPE    : ${payload.bookletType}
 🗓️ LEAVE DURATION  : ${payload.fromDate} to ${payload.toDate} (${payload.totalDays} Total Days)
 ⏱️ CHARGEABLE DAYS : ${payload.chargeableDays} Institutional Chargeable Days
 📍 DESTINATION     : ${payload.destination}
 📝 REASON          : ${payload.reason || "Institutional Vacation Recess"}
 ${payload.quotaAlertFlag ? `⚠️ QUOTA STATUS   : ${payload.quotaAlertFlag}` : "✅ QUOTA STATUS   : Within Semester Allowance"}
──────────────────────────────────────────────────────────────────────────────────
 🔗 SECURE PARENT MAGIC LINK:
 👉 ${payload.magicLinkUrl}
══════════════════════════════════════════════════════════════════════════════════
`;

  // Always output prominently to terminal console
  console.log(terminalLog);

  let sendError: string | undefined = undefined;
  let emailSucceeded = false;

  // Attempt live delivery using working nodemailer setup
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const port = Number(process.env.SMTP_PORT) || 587;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465, // With port 587 use secure: false, with port 465 use secure: true
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      console.log(`[Email Dispatcher] Outbound SMTP handshake initiated for ${recipient}...`);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: recipient,
        subject: `Leave approval request for ${payload.studentName}`,
        text: `Leave approval request for ${payload.studentName}\n\nStudent Name: ${payload.studentName}\nRoll Number: ${payload.rollNumber}${payload.className ? `\nClass: ${payload.className}` : ""}\nHostel: ${payload.hostelName}\nLeave Type: ${payload.bookletType}\nFrom: ${payload.fromDate}\nTo: ${payload.toDate}${payload.days ? `\nNo. of Days: ${payload.days}` : ""}\nDestination: ${payload.destination}\nReason: ${payload.reason || "Not specified"}\n\nReview Request:\n${payload.magicLinkUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
            <h2 style="color: #0A192F; margin-top: 0; font-size: 18px;">Leave Approval Request</h2>
            <p style="font-size: 13px; line-height: 1.5;">A leave request has been submitted with the following details:</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
              <tr><td style="padding: 5px 0; color: #64748b; width: 120px;">Student Name:</td><td style="padding: 5px 0; font-weight: bold; color: #0f172a;">${payload.studentName}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b;">Roll Number:</td><td style="padding: 5px 0; font-weight: bold; color: #0f172a;">${payload.rollNumber}</td></tr>
              ${payload.className ? `<tr><td style="padding: 5px 0; color: #64748b;">Class:</td><td style="padding: 5px 0; color: #0f172a;">${payload.className}</td></tr>` : ""}
              <tr><td style="padding: 5px 0; color: #64748b;">Hostel:</td><td style="padding: 5px 0; color: #0f172a;">${payload.hostelName}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b;">Leave Type:</td><td style="padding: 5px 0; font-weight: bold; color: #0f172a;">${payload.bookletType}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b;">From Date:</td><td style="padding: 5px 0; color: #0f172a;">${payload.fromDate}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b;">To Date:</td><td style="padding: 5px 0; color: #0f172a;">${payload.toDate}</td></tr>
              ${payload.days ? `<tr><td style="padding: 5px 0; color: #64748b;">No. of Days:</td><td style="padding: 5px 0; color: #0f172a;">${payload.days}</td></tr>` : ""}
              <tr><td style="padding: 5px 0; color: #64748b;">Destination:</td><td style="padding: 5px 0; color: #0f172a;">${payload.destination}</td></tr>
              <tr><td style="padding: 5px 0; color: #64748b;">Reason:</td><td style="padding: 5px 0; color: #0f172a;">${payload.reason || "Not specified"}</td></tr>
            </table>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${payload.magicLinkUrl}" style="background-color: #0A192F; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                Review Request
              </a>
            </div>
          </div>
        `,
      });
      console.log(`[Email Dispatcher] Outbound SMTP email successfully dispatched to ${recipient}`);
      emailSucceeded = true;
    } else {
      sendError = "SMTP credentials not configured";
    }
  } catch (err: any) {
    sendError = err?.message || "Unknown SMTP error";
    console.error("[Email Dispatcher] Live SMTP send failed (full error):", err);
  }

  return {
    success: emailSucceeded,
    recipient,
    magicLinkUrl: payload.magicLinkUrl,
    logOutput: terminalLog,
    error: sendError,
  };
}
