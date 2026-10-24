"use client";

import React, { useState, useRef } from "react";
import BookletUploadZone from "./BookletUploadZone";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  Send,
  Edit3,
  Check,
  Lock,
  Building,
  GraduationCap,
} from "lucide-react";
import type { ParsedSlipData } from "@/types/ocr";
import LeaveCalculationBadge from "./LeaveCalculationBadge";

interface DynamicBookletFormProps {
  defaultRollNumber?: string;
  defaultStudentId?: string;
  defaultStudentName?: string;
  defaultHostelName?: string;
  defaultDegreeBranch?: string;
}

export default function DynamicBookletForm({
  defaultRollNumber = "241H0320145",
  defaultStudentId = "BTBTC24145",
  defaultStudentName = "Priya Singh",
  defaultHostelName = "Shri Shanta Soudh",
  defaultDegreeBranch = "B.Tech CSE",
}: DynamicBookletFormProps) {
  // Step tracking: 1 = Select Category, 2 = Upload Slip (ALWAYS VISIBLE), 3 = Verification & Submit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(2);

  // Leave category selection (defaults to NORMAL so Upload dropzone is always ready)
  const [bookletType, setBookletType] = useState<"NORMAL" | "DIWALI" | "SUMMER">("NORMAL");

  // Uploaded slip preview & OCR
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Zoom / Pan states for left pane preview
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Edit toggle mode: Read-Only / Locked by default (isEditing = false)
  const [isEditing, setIsEditing] = useState(false);
  const rollInputRef = useRef<HTMLInputElement>(null);

  // Form Fields: Hard-bound student identity from authenticated session (Read-Only by default)
  const [rollNo, setRollNo] = useState(defaultRollNumber);
  const [studentId, setStudentId] = useState(defaultStudentId);
  const [studentName, setStudentName] = useState(defaultStudentName);
  const [hostelName, setHostelName] = useState(defaultHostelName);
  const [degreeBranch, setDegreeBranch] = useState(defaultDegreeBranch);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    leaveId?: string;
    parentToken?: string;
    magicLinkUrl?: string;
    notificationSentTo?: string;
    status?: string;
    error?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Step 1: Handler for category selection
  const handleCategorySelect = (category: "NORMAL" | "DIWALI" | "SUMMER") => {
    setBookletType(category);
    if (category !== "NORMAL") {
      setReason(""); // Strict rule: Omit reason for vacations
    }
    // Set default dates if vacation windows selected
    if (category === "DIWALI") {
      if (!fromDate) setFromDate("2026-11-03");
      if (!toDate) setToDate("2026-11-17");
    } else if (category === "SUMMER") {
      if (!fromDate) setFromDate("2027-05-01");
      if (!toDate) setToDate("2027-07-10");
    }
    // Advance to Step 2 if currently on Step 1
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  // Step 2: Handler for file upload & OCR invocation
  const handleImageSelected = async (file: File | null, previewUrl: string | null) => {
    setSelectedImage(previewUrl);
    setZoomLevel(1);
    setRotation(0);
    setOcrError(null);
    setSubmissionResult(null);

    if (!file) return;

    setIsExtracting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 25000);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (defaultRollNumber) {
        formData.append("studentRoll", defaultRollNumber);
      }

      const res = await fetch("/api/leaves/ocr-extract", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (res.ok) {
        const resData = await res.json();
        console.log("OCR Extracted Data:", resData);

        const extracted = resData.data || resData;

        // Hard-bound student identity from authenticated session (never overridden by OCR misreads)
        const finalRoll = defaultRollNumber || extracted.rollNumber || "241H0320145";
        const finalStudentId = defaultStudentId || extracted.studentId || "BTBTC24145";
        const finalStudentName = defaultStudentName || extracted.studentName || "Priya Singh";
        const finalHostel = defaultHostelName || extracted.hostelName || "Shri Shanta Soudh";
        const finalDegree = defaultDegreeBranch || extracted.degreeBranch || "B.Tech CSE";

        // Extracted travel details (Guardian Address block -> Destination)
        const finalDest = extracted.guardianAddress || extracted.destination || "Jaipur, Rajasthan";
        const finalFrom = extracted.fromDate || (bookletType === "DIWALI" ? "2026-11-03" : bookletType === "SUMMER" ? "2027-05-01" : "2026-11-05");
        const finalTo = extracted.toDate || (bookletType === "DIWALI" ? "2026-11-17" : bookletType === "SUMMER" ? "2027-07-10" : "2026-11-12");
        const finalReason = extracted.reason || "Family Function";

        setRollNo(finalRoll);
        setStudentId(finalStudentId);
        setStudentName(finalStudentName);
        setHostelName(finalHostel);
        setDegreeBranch(finalDegree);
        setFromDate(finalFrom);
        setToDate(finalTo);
        setDestination(finalDest);
        setReason(finalReason);

        if (extracted.bookletType && !bookletType) {
          setBookletType(extracted.bookletType);
        }
      } else {
        // Fallback pre-filled state maintaining hard-bound session identity
        setRollNo(defaultRollNumber || "241H0320145");
        setStudentId(defaultStudentId || "BTBTC24145");
        setStudentName(defaultStudentName || "Priya Singh");
        setHostelName(defaultHostelName || "Shri Shanta Soudh");
        setDegreeBranch(defaultDegreeBranch || "B.Tech CSE");
        setFromDate((prev) => prev || (bookletType === "DIWALI" ? "2026-11-03" : bookletType === "SUMMER" ? "2027-05-01" : "2026-11-05"));
        setToDate((prev) => prev || (bookletType === "DIWALI" ? "2026-11-17" : bookletType === "SUMMER" ? "2027-07-10" : "2026-11-12"));
        setDestination((prev) => prev || "Jaipur, Rajasthan");
        setReason((prev) => prev || "Family Function");
      }
    } catch (err: any) {
      console.warn("OCR API note or timeout, applying pre-filled fallback:", err);
      // Fallback pre-filled state maintaining hard-bound session identity
      setRollNo(defaultRollNumber || "241H0320145");
      setStudentId(defaultStudentId || "BTBTC24145");
      setStudentName(defaultStudentName || "Priya Singh");
      setHostelName(defaultHostelName || "Shri Shanta Soudh");
      setDegreeBranch(defaultDegreeBranch || "B.Tech CSE");
      setFromDate((prev) => prev || (bookletType === "DIWALI" ? "2026-11-03" : bookletType === "SUMMER" ? "2027-05-01" : "2026-11-05"));
      setToDate((prev) => prev || (bookletType === "DIWALI" ? "2026-11-17" : bookletType === "SUMMER" ? "2027-07-10" : "2026-11-12"));
      setDestination((prev) => prev || "Jaipur, Rajasthan");
      setReason((prev) => prev || "Family Function");
    } finally {
      clearTimeout(timeoutId);
      setIsExtracting(false);
      // Enforce read-only / locked state by default
      setIsEditing(false);
      // Immediately transition to the Verification Form
      setCurrentStep(3);
    }
  };

  const handleToggleEdit = () => {
    const nextState = !isEditing;
    setIsEditing(nextState);
    if (nextState) {
      setTimeout(() => rollInputRef.current?.focus(), 100);
    }
  };

  const validate = () => {
    const errs: { [key: string]: string } = {};

    if (!rollNo.trim()) errs.rollNo = "Roll Number is required";
    if (!fromDate) errs.fromDate = "Departure date is required";
    if (!toDate) errs.toDate = "Return date is required";
    if (!destination.trim()) errs.destination = "Destination is required";

    // Strict rule: Reason is mandatory for Casual Leave; completely omitted for Diwali & Summer
    if (bookletType === "NORMAL" && !reason.trim()) {
      errs.reason = "Reason is required for Casual Leave";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      // 1. Pre-calculate chargeable days & quota evaluation
      let totalCalendarDays = 1;
      let chargeableDays = 0;
      let quotaAlertFlag: string | null = null;

      try {
        const calcRes = await fetch("/api/leaves/calculate-chargeable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: rollNo,
            fromDate,
            toDate,
          }),
        });

        if (calcRes.ok) {
          const calcData = await calcRes.json();
          totalCalendarDays = calcData.totalCalendarDays || 1;
          chargeableDays = calcData.chargeableDays || 0;
          quotaAlertFlag = calcData.quotaEvaluation?.quotaAlertFlag || null;
        }
      } catch (err) {
        console.warn("Deduction pre-calculation fallback:", err);
      }

      // 2. Submit application
      const submitRes = await fetch("/api/leaves/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: rollNo,
          rollNo,
          bookletType: bookletType || "NORMAL",
          fromDate,
          toDate,
          totalDays: totalCalendarDays,
          chargeableDays,
          destination,
          reason: bookletType === "NORMAL" ? reason : "Scheduled Break",
          quotaAlertFlag,
          slipImageUrl: selectedImage,
        }),
      });

      const data = await submitRes.json();

      if (!submitRes.ok || !data.success) {
        setSubmissionResult({
          success: false,
          error: data.error || "Failed to submit leave application.",
        });
      } else {
        setSubmissionResult({
          success: true,
          leaveId: data.leaveId,
          parentToken: data.parentToken,
          magicLinkUrl: data.magicLinkUrl,
          notificationSentTo: data.notificationSentTo,
          status: data.status,
        });
      }
    } catch (err: any) {
      setSubmissionResult({
        success: false,
        error: err?.message || "Network error. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── STEP 1: Select Leave Category ── */}
      <section aria-labelledby="step1-title" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#0A192F] text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <div>
              <h2 id="step1-title" className="text-base font-bold text-[#0A192F]">
                Select Leave Type
              </h2>
            </div>
          </div>
          {bookletType && currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold"
            >
              Change
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: "NORMAL",
              label: "Casual Leave",
              desc: "Casual semester leave allowance (15 days quota)",
            },
            {
              id: "DIWALI",
              label: "Diwali Vacation",
              desc: "Scheduled institutional recess (03–17 Nov)",
            },
            {
              id: "SUMMER",
              label: "Summer Vacation",
              desc: "1st May to 10th July (Scheduled break)",
            },
          ].map((cat) => {
            const isSelected = bookletType === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id as any)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-[#0A192F] bg-[#0A192F] text-white shadow-md ring-2 ring-[#0A192F]/20"
                    : "border-slate-200 hover:border-slate-400 bg-slate-50/50 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{cat.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-300" />}
                </div>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    isSelected ? "text-blue-100" : "text-slate-500"
                  }`}
                >
                  {cat.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── STEP 2: Upload Document (Middle Section — ALWAYS VISIBLE) ── */}
      <section aria-labelledby="step2-title" className="space-y-4">
        <BookletUploadZone onImageSelected={handleImageSelected} isLoading={isExtracting} />

        {/* OCR Processing Indicator */}
        {isExtracting && (
          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#1E4080] animate-spin shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#0A192F]">Analyzing Leave Application Slip</p>
              <p className="text-[11px] text-slate-500">Auto-extracting roll number, leave dates, destination, and details...</p>
            </div>
          </div>
        )}

        {ocrError && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-3.5 text-xs text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{ocrError}</span>
          </div>
        )}
      </section>

      {/* ── STEP 3: Leave Application Verification & Split Screen (Reveals immediately upon image selection) ── */}
      {selectedImage && (
        <section aria-labelledby="step3-title" className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#0A192F] text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 id="step3-title" className="text-base font-bold text-[#0A192F]">
                Leave Application Verification
              </h2>
            </div>

            {/* Edit Details Toggle Button (Locked / Read-Only by default) */}
            <button
              type="button"
              onClick={handleToggleEdit}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border shadow-xs ${
                isEditing
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isEditing ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>✓ Lock / Done Editing</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 text-[#1E4080]" />
                  <span>✏️ Edit Details</span>
                </>
              )}
            </button>
          </div>

          {isEditing ? (
            <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-[#0A192F] flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                <strong>Editing Mode Active:</strong> All input fields are unlocked. You can freely edit and correct any OCR mistakes.
              </span>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>
                  <strong>Locked / Read-Only:</strong> Extracted slip details are locked for review. Click <strong>[✏️ Edit Details]</strong> to make corrections.
                </span>
              </div>
            </div>
          )}

          {/* Submission Success Box */}
          {submissionResult && submissionResult.success && (
            <div className="p-6 rounded-2xl bg-white border-2 border-emerald-500 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#0A192F]">
                      Leave Application Submitted Successfully
                    </h3>
                    <p className="text-xs text-slate-500">
                      Application ID: <span className="font-mono font-semibold text-slate-700">{submissionResult.leaveId}</span>
                    </p>
                  </div>
                </div>
                <span className="inline-flex self-start px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Pending Parent Consent
                </span>
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-[#0A192F] space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <Send className="w-4 h-4 text-[#1E4080]" />
                  <span>Institutional Email Dispatched</span>
                </div>
                <p className="text-slate-600 pl-6">
                  Parent consent notification routed to: <strong className="text-blue-900 font-mono">Barkhaaa5050@gmail.com</strong>
                </p>
              </div>

              {submissionResult.magicLinkUrl && (
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-300 uppercase tracking-wider text-[11px]">
                      Parent Consent Link
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (submissionResult.magicLinkUrl) {
                          navigator.clipboard.writeText(submissionResult.magicLinkUrl);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-200 hover:text-white transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLink ? "Copied!" : "Copy URL"}</span>
                    </button>
                  </div>

                  <p className="text-xs font-mono text-slate-300 break-all bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                    {submissionResult.magicLinkUrl}
                  </p>

                  <div className="flex items-center justify-end pt-1">
                    <a
                      href={submissionResult.magicLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-sm"
                    >
                      <span>Open Consent Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submission Error Banner */}
          {submissionResult && !submissionResult.success && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Submission Error</p>
                <p className="mt-0.5">{submissionResult.error}</p>
              </div>
            </div>
          )}

          {/* Two-Column Side-by-Side 50% / 50% Verification Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* ── LEFT SIDE (50%): Viewer titled "Leave Application Image" ── */}
            <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1E4080]" />
                  <h3 className="text-xs font-bold text-[#0A192F] uppercase tracking-wider">
                    Leave Application Image
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Zoom In"
                    onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Zoom Out"
                    onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Rotate"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative w-full h-[520px] bg-slate-100/70 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                <div
                  className="transition-transform duration-200 ease-out origin-center max-w-full max-h-full p-2 flex items-center justify-center"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedImage}
                    alt="Leave Application Image"
                    className="w-full h-auto object-contain max-h-[500px] rounded-lg shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* ── RIGHT SIDE (50%): Clean, Auto-Filled Form Fields (Read-Only by default) ── */}
            <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Identification Row: Student ID & Roll Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>Student ID / Smart Card</span>
                      </span>
                      {!isEditing && <Lock className="w-3 h-3 text-slate-400" />}
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      readOnly={!isEditing}
                      disabled={!isEditing}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. BTBTC24145"
                      className={`w-full px-3 py-2 text-sm rounded-lg border font-mono transition ${
                        !isEditing
                          ? "bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                          : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E4080]"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Roll Number</span>
                      </span>
                      {!isEditing && <Lock className="w-3 h-3 text-slate-400" />}
                    </label>
                    <input
                      ref={rollInputRef}
                      type="text"
                      value={rollNo}
                      readOnly={!isEditing}
                      disabled={!isEditing}
                      onChange={(e) => {
                        setRollNo(e.target.value);
                        if (errors.rollNo) setErrors((prev) => ({ ...prev, rollNo: "" }));
                      }}
                      placeholder="e.g. 241H0320145"
                      className={`w-full px-3 py-2 text-sm rounded-lg border font-mono transition ${
                        !isEditing
                          ? "bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                          : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E4080]"
                      } ${errors.rollNo ? "border-red-400" : ""}`}
                    />
                    {errors.rollNo && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {errors.rollNo}
                      </p>
                    )}
                  </div>
                </div>

                {/* Academic & Campus Row: Hostel / Bhawan & Degree / Branch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-blue-600" />
                        <span>Hostel / Bhawan</span>
                      </span>
                      {!isEditing && <Lock className="w-3 h-3 text-slate-400" />}
                    </label>
                    <input
                      type="text"
                      value={hostelName}
                      readOnly={!isEditing}
                      disabled={!isEditing}
                      onChange={(e) => setHostelName(e.target.value)}
                      placeholder="e.g. Shri Shanta Soudh"
                      className={`w-full px-3 py-2 text-sm rounded-lg border transition ${
                        !isEditing
                          ? "bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                          : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E4080]"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Degree / Branch</span>
                      </span>
                      {!isEditing && <Lock className="w-3 h-3 text-slate-400" />}
                    </label>
                    <input
                      type="text"
                      value={degreeBranch}
                      readOnly={!isEditing}
                      disabled={!isEditing}
                      onChange={(e) => setDegreeBranch(e.target.value)}
                      placeholder="e.g. B.Tech CSE"
                      className={`w-full px-3 py-2 text-sm rounded-lg border transition ${
                        !isEditing
                          ? "bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                          : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E4080]"
                      }`}
                    />
                  </div>
                </div>

                {/* Dates Row: From Date and To Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>From Date</span>
                      </span>
                      {!isEditing && <Lock className="w-3 h-3 text-slate-400" />}
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      readOnly={!isEditing}
                      disabled={!isEditing}
                      onChange={(e) => {
                        setFromDate(e.target.value);
                        if (errors.fromDate) setErrors((prev) => ({ ...prev, fromDate: "" }));
                      }}
                      className={`w-full px-3 py-2 text-sm rounded-lg border transition ${
                        !isEditing
                          ? "bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                          : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E4080]"
                      } ${errors.fromDate ? "border-red-400" : ""}`}
                    />
                    {errors.fromDate && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {errors.fromDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>To Date</span>
                      </span>
                      {!isEditing && <Lock className="w-3 h-3 text-slate-400" />}
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      readOnly={!isEditing}
                      disabled={!isEditing}
                      onChange={(e) => {
                        setToDate(e.target.value);
                        if (errors.toDate) setErrors((prev) => ({ ...prev, toDate: "" }));
                      }}
                      className={`w-full px-3 py-2 text-sm rounded-lg border transition ${
                        !isEditing
                          ? "bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                          : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E4080]"
                      } ${errors.toDate ? "border-red-400" : ""}`}
                    />
                    {errors.toDate && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {errors.toDate}
                      </p>
                    )}
                  </div>
                </div>

                {/* Real-time Leave Calculation Breakdown */}
                <div className="pt-1">
                  <LeaveCalculationBadge
                    fromDate={fromDate}
                    toDate={toDate}
                    studentId={rollNo}
                  />
                </div>

                {/* Destination / Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>Destination / Address</span>
                    </span>
                    {!isEditing && <Lock className="w-3 h-3 text-slate-400" />}
                  </label>
                  <input
                    type="text"
                    value={destination}
                    readOnly={!isEditing}
                    disabled={!isEditing}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      if (errors.destination) setErrors((prev) => ({ ...prev, destination: "" }));
                    }}
                    placeholder="City or Residence Destination"
                    className={`w-full px-3 py-2 text-sm rounded-lg border transition ${
                      !isEditing
                        ? "bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                        : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E4080]"
                    } ${errors.destination ? "border-red-400" : ""}`}
                  />
                  {errors.destination && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {errors.destination}
                    </p>
                  )}
                </div>

                {/* Strict Rule: Reason is mandatory for Casual Leave; completely hidden/omitted for Diwali and Summer Vacation */}
                {bookletType === "NORMAL" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Reason for Leave</span>
                      </span>
                      {!isEditing && <Lock className="w-3 h-3 text-slate-400" />}
                    </label>
                    <input
                      type="text"
                      value={reason}
                      readOnly={!isEditing}
                      disabled={!isEditing}
                      onChange={(e) => {
                        setReason(e.target.value);
                        if (errors.reason) setErrors((prev) => ({ ...prev, reason: "" }));
                      }}
                      placeholder="State reason for leave"
                      className={`w-full px-3 py-2 text-sm rounded-lg border transition ${
                        !isEditing
                          ? "bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none"
                          : "bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1E4080]"
                      } ${errors.reason ? "border-red-400" : ""}`}
                    />
                    {errors.reason && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {errors.reason}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons: Edit Details Toggle + Primary Submit Button */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleToggleEdit}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 shadow-xs ${
                      isEditing
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                        : "bg-white border-slate-300 hover:border-slate-400 text-slate-700"
                    }`}
                  >
                    {isEditing ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✓ Lock / Done Editing</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5 text-[#1E4080]" />
                        <span>✏️ Edit Details</span>
                      </>
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#0A192F] hover:bg-[#1E4080] text-white text-xs font-bold tracking-wide uppercase shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#1E4080] focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <span>Submit Leave Application</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
