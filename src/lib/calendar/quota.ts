/**
 * CampusFlow — Semester Quota Evaluator & Non-Blocking Alert Engine
 * src/lib/calendar/quota.ts
 *
 * Implements:
 * 1. Base allowance: 15 Casual leave days per semester (Session 2026-27).
 * 2. Computes total consumed chargeable days from approved leaves.
 * 3. Non-blocking excess rule:
 *    - If (Consumed + Requested) > 15:
 *      * Set isExceeded = true
 *      * Excess days = Consumed + Requested - 15
 *      * Non-blocking audit flag: "Quota Status: Exceeded by +X Days"
 *    - If within allowance:
 *      * Set isExceeded = false
 *      * Remaining days = 15 - (Consumed + Requested)
 *      * Audit flag: "Quota Status: Within Allowance (Y Days Remaining)"
 */

import { prisma } from "@/lib/prisma";
import { LeaveType, LeaveStatus } from "@prisma/client";

export interface QuotaEvaluation {
  baseAllowance: number;
  consumedDays: number;
  requestedChargeableDays: number;
  projectedTotalDays: number;
  remainingDays: number;
  excessDays: number;
  isExceeded: boolean;
  quotaAlertFlag: string;
}

const DEFAULT_SEMESTER_ALLOWANCE = 15;
const DEFAULT_SESSION = "2026-27";

export async function evaluateQuotaStatus(
  studentIdentifier: string, // Can be student.id, userId, or rollNumber
  requestedChargeableDays: number,
  session: string = DEFAULT_SESSION
): Promise<QuotaEvaluation> {
  let student = null;
  try {
    student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentIdentifier },
          { userId: studentIdentifier },
          { rollNumber: studentIdentifier },
          { studentId: studentIdentifier },
        ],
      },
      include: {
        leaveQuota: {
          where: {
            session,
            leaveType: LeaveType.CASUAL,
          },
        },
        leaves: {
          where: {
            leaveType: LeaveType.CASUAL,
            status: {
              in: [
                LeaveStatus.APPROVED_QR_ACTIVE,
                LeaveStatus.CONSUMED,
                LeaveStatus.COMPLETED,
              ],
            },
          },
        },
      },
    });
  } catch (err) {
    console.warn("Could not query student quota from DB, using default quota allowance:", err);
  }

  // Base allowance default 15
  const quotaRecord = student?.leaveQuota?.[0];
  const baseAllowance = quotaRecord ? quotaRecord.totalDays : DEFAULT_SEMESTER_ALLOWANCE;

  // Calculate consumed chargeable days from previous approved leaves
  let consumedDays = 0;
  if (student?.leaves && student.leaves.length > 0) {
    consumedDays = student.leaves.reduce((sum, l) => sum + (l.chargeableDays || l.totalDays || 0), 0);
  } else if (quotaRecord) {
    consumedDays = quotaRecord.usedDays || 0;
  }

  const projectedTotalDays = consumedDays + requestedChargeableDays;
  const isExceeded = projectedTotalDays > baseAllowance;
  const excessDays = isExceeded ? projectedTotalDays - baseAllowance : 0;
  const remainingDays = isExceeded ? 0 : baseAllowance - projectedTotalDays;

  const quotaAlertFlag = isExceeded
    ? `Quota Status: Exceeded by +${excessDays} Days`
    : `Quota Status: Within Allowance (${remainingDays} Days Remaining)`;

  return {
    baseAllowance,
    consumedDays,
    requestedChargeableDays,
    projectedTotalDays,
    remainingDays,
    excessDays,
    isExceeded,
    quotaAlertFlag,
  };
}
