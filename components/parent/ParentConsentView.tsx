"use client";

import React, { useState } from "react";
import type { StoredLeave, StoredStudent } from "@/lib/db/leaves-store";

interface ParentConsentViewProps {
  token: string;
  leave: StoredLeave;
  student: StoredStudent;
}

export default function ParentConsentView({ token, leave, student }: ParentConsentViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasActioned, setHasActioned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (isSubmitting || hasActioned) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/parent/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action,
          remarks: action === "REJECT" ? "Denied by parent" : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to record response. Please try again.");
        setIsSubmitting(false);
      } else {
        setHasActioned(true);
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (hasActioned) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-[#0A192F]">
          Thank you. Your response has been recorded.
        </h2>
      </div>
    );
  }

  const isCasual =
    leave.bookletType === "NORMAL" ||
    leave.leaveType === "CASUAL" ||
    (leave as any).leaveCategory === "Casual Leave";

  const leaveTypeName = isCasual
    ? "Casual Leave"
    : leave.bookletType === "DIWALI" || leave.leaveType === "MID_TERM_RECESS"
    ? "Diwali Vacation"
    : "Summer Vacation";

  const fromFormatted = new Date(leave.fromDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const toFormatted = new Date(leave.toDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const getSampleSlipFallback = (roll?: string) => {
    const r = (roll || "").trim();
    if (r === "241H0320188") return "/sample-slips/slip_ananya.png";
    if (r === "241H0320215") return "/sample-slips/slip_sneha.png";
    if (r === "241H0320245") return "/sample-slips/slip_kavya.png";
    if (r === "241H0320278") return "/sample-slips/slip_megha.png";
    return "/sample-slips/slip_priya.png";
  };

  const rawSlipUrl = leave.slipImageUrl || "";
  const fallbackSlip = getSampleSlipFallback(student?.rollNumber || leave.studentRollNumber);
  const resolvedSlipSrc = !rawSlipUrl || rawSlipUrl.startsWith("blob:")
    ? fallbackSlip
    : rawSlipUrl;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
      <h1 className="text-2xl font-bold text-[#0A192F] border-b pb-4">Leave Request</h1>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
          {errorMessage}
        </div>
      )}

      <div className="space-y-3 text-sm text-slate-800">
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">Student Name:</span>
          <span className="font-semibold text-[#0A192F]">{student.fullName}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">Roll Number:</span>
          <span className="font-semibold text-[#0A192F]">{student.rollNumber}</span>
        </div>
        {leave.className && (
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Class:</span>
            <span className="font-semibold text-[#0A192F]">{leave.className}</span>
          </div>
        )}
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">Hostel:</span>
          <span className="font-semibold text-[#0A192F]">{student.hostelName}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">Leave Type:</span>
          <span className="font-semibold text-[#0A192F]">{leaveTypeName}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">From Date:</span>
          <span className="font-semibold text-[#0A192F]">{fromFormatted}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">To Date:</span>
          <span className="font-semibold text-[#0A192F]">{toFormatted}</span>
        </div>
        {leave.days && (
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">No. of Days:</span>
            <span className="font-semibold text-[#0A192F]">{leave.days}</span>
          </div>
        )}
        <div className="flex justify-between py-1.5 border-b border-slate-100">
          <span className="text-slate-500">Destination:</span>
          <span className="font-semibold text-[#0A192F] text-right">{leave.destination}</span>
        </div>
        {isCasual && leave.reason && (
          <div className="flex justify-between py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Reason:</span>
            <span className="font-semibold text-[#0A192F] text-right">{leave.reason}</span>
          </div>
        )}

        {resolvedSlipSrc && (
          <div className="pt-2">
            <span className="block text-xs font-medium text-slate-500 mb-1">Attached Slip:</span>
            <div className="border rounded-lg overflow-hidden bg-slate-50 p-2 max-w-sm mx-auto flex items-center justify-center">
              <img
                src={resolvedSlipSrc}
                alt="Leave Slip"
                className="max-h-64 w-auto object-contain mx-auto rounded"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== fallbackSlip) {
                    target.src = fallbackSlip;
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 grid grid-cols-2 gap-4">
        <button
          type="button"
          disabled={isSubmitting || hasActioned}
          onClick={() => handleAction("APPROVE")}
          className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? "Processing..." : "Approve"}
        </button>
        <button
          type="button"
          disabled={isSubmitting || hasActioned}
          onClick={() => handleAction("REJECT")}
          className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base transition shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? "Processing..." : "Deny"}
        </button>
      </div>
    </div>
  );
}
