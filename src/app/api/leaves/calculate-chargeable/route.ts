/**
 * CampusFlow — API Route: Calculate Chargeable Leave Days
 * app/api/leaves/calculate-chargeable/route.ts
 *
 * Accepts JSON body:
 *   { fromDate: string, toDate: string, studentId?: string }
 *
 * Returns:
 *   - totalCalendarDays
 *   - tuesdaysCount
 *   - gazettedHolidaysCount
 *   - overlappingTuesdaysAndHolidays
 *   - totalDeductions
 *   - chargeableDays
 *   - breakdown: DayBreakdown[]
 *   - quotaEvaluation?: QuotaEvaluation
 */

import { NextRequest, NextResponse } from "next/server";
import { calculateChargeableDays } from "@/lib/calendar/deductions";
import { evaluateQuotaStatus } from "@/lib/calendar/quota";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromDate, toDate, studentId } = body;

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "Both 'fromDate' and 'toDate' fields are required." },
        { status: 400 }
      );
    }

    const deductionResult = await calculateChargeableDays(fromDate, toDate);

    let quotaResult = undefined;
    if (studentId) {
      quotaResult = await evaluateQuotaStatus(studentId, deductionResult.chargeableDays);
    }

    return NextResponse.json(
      {
        ...deductionResult,
        quotaEvaluation: quotaResult,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Calculate Chargeable Days Error:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate chargeable days.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
