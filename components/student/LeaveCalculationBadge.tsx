"use client";

import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle2, AlertTriangle, Info, Clock, Sparkles } from "lucide-react";
import { DeductionResult } from "@/lib/calendar/deductions";
import { QuotaEvaluation } from "@/lib/calendar/quota";

export interface LeaveCalculationBadgeProps {
  fromDate?: string;
  toDate?: string;
  studentId?: string;
  onCalculationComplete?: (result: DeductionResult & { quotaEvaluation?: QuotaEvaluation }) => void;
}

export default function LeaveCalculationBadge({
  fromDate,
  toDate,
  studentId,
  onCalculationComplete,
}: LeaveCalculationBadgeProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<(DeductionResult & { quotaEvaluation?: QuotaEvaluation }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromDate || !toDate) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/leaves/calculate-chargeable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromDate, toDate, studentId }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.details || "Failed to calculate leave days");
        }

        const json = await res.json();
        if (isMounted) {
          setData(json);
          if (onCalculationComplete) {
            onCalculationComplete(json);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || "Invalid date selection");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fromDate, toDate, studentId]);

  if (!fromDate || !toDate) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-500 flex items-center gap-2">
        <Info className="w-4 h-4 text-[#1E4080] shrink-0" />
        <span>Select departure and return dates to compute net chargeable days & quota status.</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-[#1E4080] border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-xs font-medium text-slate-600">
          Calculating calendar deductions (Tuesdays & Gazetted Holidays)...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!data) return null;

  const quota = data.quotaEvaluation;
  const isExceeded = quota?.isExceeded ?? false;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-[#0A192F] px-4 py-3 flex items-center justify-between text-white border-b border-[#1E4080]">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-300" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Leave Deduction Breakdown
          </span>
        </div>
        {quota && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              isExceeded
                ? "bg-amber-400 text-amber-950"
                : "bg-emerald-400 text-emerald-950"
            }`}
          >
            {isExceeded ? (
              <AlertTriangle className="w-3 h-3 text-amber-950" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-950" />
            )}
            <span>
              {isExceeded
                ? `Exceeded by +${quota.excessDays} Days`
                : `Within Quota (${quota.remainingDays}d Left)`}
            </span>
          </div>
        )}
      </div>

      {/* ── Key Metrics Cards ── */}
      <div className="p-4 grid grid-cols-3 gap-3 text-center border-b border-slate-100 bg-slate-50/50">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Calendar Days
          </div>
          <div className="text-xl font-extrabold text-[#0A192F] mt-0.5">
            {data.totalCalendarDays}
          </div>
          <div className="text-[10px] text-slate-500">Inclusive Span</div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Deducted Days
          </div>
          <div className="text-xl font-extrabold text-blue-700 mt-0.5">
            -{data.totalDeductions}
          </div>
          <div className="text-[10px] text-slate-500">Tuesdays & Holidays</div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 ring-1 ring-[#0A192F]/10">
          <div className="text-[10px] font-bold text-[#0A192F] uppercase tracking-wider">
            Net Chargeable
          </div>
          <div className="text-xl font-extrabold text-[#0A192F] mt-0.5">
            {data.chargeableDays}
          </div>
          <div className="text-[10px] text-slate-500">Against Quota</div>
        </div>
      </div>

      {/* ── Deduction Details Row ── */}
      <div className="p-4 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Intervening Tuesdays:
          </span>
          <span className="font-semibold text-slate-800">{data.tuesdaysCount} Days</span>
        </div>

        <div className="flex items-center justify-between text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Official Gazetted Holidays:
          </span>
          <span className="font-semibold text-slate-800">{data.gazettedHolidaysCount} Days</span>
        </div>

        {data.overlappingTuesdaysAndHolidays > 0 && (
          <div className="flex items-center justify-between text-slate-500 text-[11px] pt-0.5">
            <span>Tuesday-Holiday Coincidences (deducted 1x):</span>
            <span className="font-medium text-slate-600">
              {data.overlappingTuesdaysAndHolidays} Days
            </span>
          </div>
        )}

        {/* ── Non-Blocking Quota Alert Banner ── */}
        {quota && (
          <div
            className={`mt-3 p-3 rounded-xl border text-xs ${
              isExceeded
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}
          >
            <div className="flex items-start gap-2">
              {isExceeded ? (
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">{quota.quotaAlertFlag}</p>
                <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                  {isExceeded
                    ? "Submission will proceed normally without blocking. This non-blocking excess flag is recorded for institutional review."
                    : `Consumed: ${quota.consumedDays}d / 15d base allowance. Remaining after this leave: ${quota.remainingDays} days.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
