/**
 * CampusFlow — Institutional Leave Deduction Engine
 * src/lib/calendar/deductions.ts
 *
 * Implements:
 * 1. Inclusive day iteration between fromDate and toDate.
 * 2. Tuesday deduction rule (every Tuesday is non-chargeable).
 * 3. Official Gazetted Holiday deduction rule.
 * 4. Deduplication rule: If a Tuesday coincides with a declared Gazetted Holiday,
 *    it is deducted only ONCE.
 * 5. Returns detailed breakdown metrics and day-by-day classification.
 */

import { prisma, withDbTimeout } from "@/lib/prisma";

export interface DayBreakdown {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  isTuesday: boolean;
  isGazettedHoliday: boolean;
  holidayName?: string;
  isChargeable: boolean;
  deductionReason?: string;
}

export interface DeductionResult {
  totalCalendarDays: number;
  tuesdaysCount: number;
  gazettedHolidaysCount: number;
  overlappingTuesdaysAndHolidays: number;
  totalDeductions: number;
  chargeableDays: number;
  breakdown: DayBreakdown[];
}

// Convert Date object to UTC midnight representation
function toMidnightUTC(dateInput: Date | string): Date {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function formatDateString(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Calculates net chargeable days for a requested leave date range.
 * Formula:
 * Chargeable Days = Total Days (Inclusive) - Total Non-Chargeable Days
 * Non-Chargeable Days = Tuesdays U Gazetted Holidays (de-duplicated)
 */
export async function calculateChargeableDays(
  fromDateInput: Date | string,
  toDateInput: Date | string
): Promise<DeductionResult> {
  const fromDate = toMidnightUTC(fromDateInput);
  const toDate = toMidnightUTC(toDateInput);

  if (fromDate.getTime() > toDate.getTime()) {
    throw new Error("Departure date ('fromDate') cannot be after return date ('toDate').");
  }

  // Fetch academic calendar records intersecting the requested range
  let calendarRecords: Array<{
    date: Date;
    eventName: string;
    isHoliday: boolean;
    isTuesday: boolean;
    holidayType: string;
  }> = [];

  try {
    const records = await withDbTimeout(
      prisma.academic_Calendar.findMany({
        where: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      }),
      400
    );
    if (records) calendarRecords = records;
  } catch (err) {
    console.warn("Could not query academic_calendar from DB, using fallback rule engine:", err);
  }

  // Map calendar records by YYYY-MM-DD
  const calendarMap = new Map<string, typeof calendarRecords[0]>();
  for (const record of calendarRecords) {
    calendarMap.set(formatDateString(record.date), record);
  }

  const breakdown: DayBreakdown[] = [];
  let totalCalendarDays = 0;
  let tuesdaysCount = 0;
  let gazettedHolidaysCount = 0;
  let overlappingTuesdaysAndHolidays = 0;
  let totalDeductions = 0;

  const current = new Date(fromDate.getTime());

  while (current.getTime() <= toDate.getTime()) {
    totalCalendarDays++;
    const dateStr = formatDateString(current);
    const dayOfWeek = DAYS_OF_WEEK[current.getUTCDay()];
    const isTuesday = current.getUTCDay() === 2;

    const record = calendarMap.get(dateStr);
    const isGazettedHoliday = record ? (record.isHoliday && (record.holidayType === "GAZETTED" || record.holidayType === "DIWALI_WINDOW" || record.holidayType === "SUMMER_WINDOW")) : false;
    const holidayName = record?.isHoliday ? record.eventName : undefined;

    let isChargeable = true;
    let deductionReason: string | undefined = undefined;

    if (isTuesday && isGazettedHoliday) {
      // Overlap: Tuesday that is ALSO a Gazetted Holiday
      tuesdaysCount++;
      gazettedHolidaysCount++;
      overlappingTuesdaysAndHolidays++;
      totalDeductions++; // Deducted only ONCE
      isChargeable = false;
      deductionReason = `Tuesday & Gazetted Holiday (${holidayName || "Holiday"})`;
    } else if (isTuesday) {
      tuesdaysCount++;
      totalDeductions++;
      isChargeable = false;
      deductionReason = "Institutional Tuesday (Non-chargeable)";
    } else if (isGazettedHoliday) {
      gazettedHolidaysCount++;
      totalDeductions++;
      isChargeable = false;
      deductionReason = `Gazetted Holiday (${holidayName || "Holiday"})`;
    }

    breakdown.push({
      date: dateStr,
      dayOfWeek,
      isTuesday,
      isGazettedHoliday,
      holidayName,
      isChargeable,
      deductionReason,
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  const chargeableDays = totalCalendarDays - totalDeductions;

  return {
    totalCalendarDays,
    tuesdaysCount,
    gazettedHolidaysCount,
    overlappingTuesdaysAndHolidays,
    totalDeductions,
    chargeableDays,
    breakdown,
  };
}
