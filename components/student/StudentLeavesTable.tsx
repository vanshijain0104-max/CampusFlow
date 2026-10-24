"use client";

import React, { useState } from "react";
import { Trash2, AlertTriangle, CheckCircle, X } from "lucide-react";

interface LeaveItem {
  id: string;
  leaveType?: string;
  bookletType?: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  chargeableDays: number;
  destination: string;
  status: string;
}

interface StudentLeavesTableProps {
  initialLeaves: LeaveItem[];
}

export default function StudentLeavesTable({ initialLeaves }: StudentLeavesTableProps) {
  const [leaves, setLeaves] = useState<LeaveItem[]>(initialLeaves);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getLeaveTypeDisplay = (l: LeaveItem) => {
    if (l.bookletType === "NORMAL" || l.leaveType === "CASUAL") return "Casual Leave";
    if (l.bookletType === "DIWALI" || l.leaveType === "MID_TERM_RECESS") return "Diwali Vacation";
    if (l.bookletType === "SUMMER" || l.leaveType === "SUMMER_VACATION") return "Summer Vacation";
    return l.leaveType || l.bookletType || "Leave";
  };

  const isDeletable = (status: string) => {
    return status === "PENDING_PARENT" || status === "PENDING_PARENT_APPROVAL" || status === "PENDING_WARDEN_1";
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Failed to delete leave request.");
      } else {
        setLeaves((prev) => prev.filter((item) => item.id !== id));
        setToastMessage("Leave request deleted");
        setTimeout(() => setToastMessage(null), 4000);
        setConfirmId(null);
      }
    } catch {
      setErrorMessage("Network error while deleting leave request.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!leaves || leaves.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-xs font-semibold text-slate-600">No leave applications submitted yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100 font-semibold">
            <tr>
              <th className="py-2.5 px-3">Leave Type</th>
              <th className="py-2.5 px-3">Dates (Span)</th>
              <th className="py-2.5 px-3">Chargeable</th>
              <th className="py-2.5 px-3">Destination</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {leaves.map((l) => {
              const deletable = isDeletable(l.status);
              return (
                <tr key={l.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-3 font-semibold text-[#0A192F]">
                    {getLeaveTypeDisplay(l)}
                  </td>
                  <td className="py-3 px-3">
                    {new Date(l.fromDate).toLocaleDateString()} – {new Date(l.toDate).toLocaleDateString()}
                    <span className="text-slate-400 text-[11px] ml-1">({l.totalDays}d)</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#0A192F]">{l.chargeableDays}</span> days
                  </td>
                  <td className="py-3 px-3 max-w-[180px] truncate" title={l.destination}>
                    {l.destination}
                  </td>
                  <td className="py-3 px-3">
                    {l.status === "PENDING_PARENT" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending Parent Consent
                      </span>
                    ) : l.status === "PENDING_WARDEN_1" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#0A192F] border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1E4080]" />
                        Pending Warden Clearance
                      </span>
                    ) : l.status === "REJECTED_PARENT" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Rejected by Parent
                      </span>
                    ) : l.status === "APPROVED_QR_ACTIVE" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Approved & Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {l.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {deletable && (
                      <button
                        type="button"
                        onClick={() => setConfirmId(l.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition shadow-2xs"
                        title="Delete leave request"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#0A192F]">Delete Leave Request?</h3>
              <p className="text-xs text-slate-500">
                Delete this leave request? This cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmId(null)}
                className="py-2 px-4 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(confirmId)}
                className="py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white transition shadow-sm disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
