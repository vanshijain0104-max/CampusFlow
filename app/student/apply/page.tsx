"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// Helper to resize client-side image to max 1280px width before upload (keeping original for preview)
async function resizeImageTo1280(file: File): Promise<File | Blob> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        if (img.width <= maxWidth) {
          resolve(file);
          return;
        }

        const scale = maxWidth / img.width;
        const targetWidth = maxWidth;
        const targetHeight = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function ApplyLeavePage() {
  const [leaveType, setLeaveType] = useState<string>("");
  const scannedReasonRef = useRef<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    emailSent: boolean;
    emailError?: string | null;
    recipientEmail: string;
  } | null>(null);

  // Store logged-in student profile from session
  const [sessionStudent, setSessionStudent] = useState<{
    rollNumber: string;
    studentId: string;
    hostel: string;
  } | null>(null);

  // Form State: populated from session on mount, then updated by scanned slip
  const [formData, setFormData] = useState({
    rollNumber: "",
    studentId: "",
    hostel: "",
    className: "",
    days: "",
    fromDate: "",
    toDate: "",
    destination: "",
    reason: "",
  });

  // Track if session was already fetched to prevent duplicate network calls
  const sessionFetchedRef = useRef(false);
  const lastUploadedFileRef = useRef<File | null>(null);

  // Clean up blob URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Dynamically load authenticated student profile once on mount
  useEffect(() => {
    if (sessionFetchedRef.current) return;
    sessionFetchedRef.current = true;
    let isMounted = true;

    async function loadStudentSession() {
      try {
        const res = await fetch("/api/student/me");
        if (res.ok) {
          const json = await res.json();
          if (json?.student && isMounted) {
            const profile = {
              rollNumber: json.student.rollNumber || "",
              studentId: json.student.studentId || "",
              hostel: json.student.hostel || "",
            };
            setSessionStudent(profile);
            setFormData((prev) => ({
              ...prev,
              rollNumber: profile.rollNumber || prev.rollNumber,
              studentId: profile.studentId || prev.studentId,
              hostel: profile.hostel || prev.hostel,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load student profile:", err);
      }
    }

    loadStudentSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const normalize = (val?: string) => (val || "").replace(/\s+/g, "").toLowerCase();

  const runScan = useCallback(
    async (file: File) => {
      // Read as Data URL so image is permanent and universally renderable across tabs/sessions
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
      const dataUrl = await dataUrlPromise;

      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      const preview = dataUrl || URL.createObjectURL(file);
      setImagePreview(preview);
      setLoading(true);
      setScanMessage(null);
      setMismatchWarning(null);

      // Browser timeout set to 120 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        // Client-side resize to 1280px width, 0.85 quality before upload (keeps original for preview)
        const fileToUpload = await resizeImageTo1280(file);

        const data = new FormData();
        data.append("file", fileToUpload);

        const res = await fetch("/api/leaves/ocr-extract", {
          method: "POST",
          body: data,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json?.success) {
          console.error("[OCR Terminal Details]:", json?.terminalError || json?.error || `HTTP ${res.status}`);
          setScanMessage(
            "Scanning is busy right now. Please try again in a minute, or click Edit Details to fill the form manually."
          );
        } else {
          setScanMessage(null);
        }

        if (json?.data) {
          const scannedRoll = (json.data.rollNumber || "").trim();
          const scannedId = (json.data.studentId || "").trim();
          const scannedHostel = (json.data.hostel || "").trim();
          const scannedClass = (json.data.className || "").trim();
          const scannedDays = (json.data.days || "").trim();
          const scannedReason = (json.data.reason || "").trim();
          scannedReasonRef.current = scannedReason;

          const isVacation = leaveType === "Diwali Vacation" || leaveType === "Summer Vacation";
          const finalReason = isVacation ? leaveType : scannedReason;

          setFormData((prev) => ({
            ...prev,
            fromDate: json.data.fromDate || "",
            toDate: json.data.toDate || "",
            destination: json.data.destination || "",
            reason: finalReason,
            rollNumber: scannedRoll || prev.rollNumber,
            studentId: scannedId || prev.studentId,
            hostel: scannedHostel || prev.hostel,
            className: scannedClass || prev.className,
            days: scannedDays || prev.days,
          }));

          // Mismatch warning: compare scanned rollNumber with the value returned by /api/student/me, and nothing else
          const sessionRoll = sessionStudent?.rollNumber || "";

          const rollMismatch =
            Boolean(scannedRoll) &&
            Boolean(sessionRoll) &&
            normalize(scannedRoll) !== normalize(sessionRoll);

          if (rollMismatch) {
            setMismatchWarning(
              `The roll number on this slip (${scannedRoll}) does not match your logged-in account (${sessionRoll}). Please check you uploaded your own slip.`
            );
          } else {
            setMismatchWarning(null);
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn("[OCR Terminal Exception]:", err);
        setScanMessage(
          "Scanning is busy right now. Please try again in a minute, or click Edit Details to fill the form manually."
        );
      } finally {
        setLoading(false);
      }
    },
    [imagePreview, sessionStudent, leaveType]
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      lastUploadedFileRef.current = file;
      await runScan(file);
    },
    [runScan]
  );

  const handleTryAgain = useCallback(async () => {
    if (lastUploadedFileRef.current) {
      await runScan(lastUploadedFileRef.current);
    }
  }, [runScan]);

  const handleLeaveTypeChange = (newType: string) => {
    setLeaveType(newType);
    if (submitError) setSubmitError(null);

    if (newType === "Casual Leave") {
      setFormData((prev) => ({
        ...prev,
        reason:
          scannedReasonRef.current ||
          (prev.reason === "Diwali Vacation" || prev.reason === "Summer Vacation"
            ? ""
            : prev.reason),
      }));
    } else if (newType === "Diwali Vacation") {
      setFormData((prev) => ({
        ...prev,
        reason: "Diwali Vacation",
      }));
    } else if (newType === "Summer Vacation") {
      setFormData((prev) => ({
        ...prev,
        reason: "Summer Vacation",
      }));
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!leaveType) {
        setSubmitError("Please select a leave type");
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const sessionRoll = sessionStudent?.rollNumber || formData.rollNumber;
        const sessionStudentId = sessionStudent?.studentId || formData.studentId;
        const slipMatchesSession =
          normalize(formData.rollNumber) === normalize(sessionRoll) &&
          normalize(formData.studentId) === normalize(sessionStudentId);

        const bookletType =
          leaveType === "Diwali Vacation"
            ? "DIWALI"
            : leaveType === "Summer Vacation"
            ? "SUMMER"
            : "NORMAL";

        const leaveTypeEnum =
          leaveType === "Diwali Vacation"
            ? "MID_TERM_RECESS"
            : leaveType === "Summer Vacation"
            ? "SUMMER_VACATION"
            : "CASUAL";

        const finalReason =
          leaveType === "Diwali Vacation"
            ? "Diwali Vacation"
            : leaveType === "Summer Vacation"
            ? "Summer Vacation"
            : (formData.reason || "Casual Leave");

        const res = await fetch("/api/leaves/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: formData.studentId,
            rollNo: formData.rollNumber,
            hostel: formData.hostel,
            className: formData.className,
            days: formData.days,
            bookletType,
            leaveType: leaveTypeEnum,
            leaveCategory: leaveType,
            fromDate: formData.fromDate || new Date().toISOString().split("T")[0],
            toDate: formData.toDate || new Date().toISOString().split("T")[0],
            destination: formData.destination || "Not specified",
            reason: finalReason,
            slipImageUrl: imagePreview,
            sessionRollNumber: sessionRoll,
            sessionStudentId: sessionStudentId,
            slipMatchesSession,
          }),
        });

        const resJson = await res.json().catch(() => ({}));
        if (!res.ok || !resJson.success) {
          setSubmitError(resJson.error || "Failed to submit leave application.");
        } else {
          setSubmitResult({
            emailSent: Boolean(resJson.emailSent),
            emailError: resJson.emailError,
            recipientEmail: resJson.recipientEmail || sessionRoll,
          });
          setIsSubmitted(true);
        }
      } catch (err) {
        console.error("Submission error:", err);
        setSubmitError("Failed to submit leave application. Please check connection.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, leaveType, imagePreview, sessionStudent]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0A192F]">Apply for Leave</h1>
            <p className="text-sm text-slate-500">Submit and verify your physical parent signed leave application</p>
          </div>
          <Link href="/student/dashboard" className="text-sm font-medium px-4 py-2 border rounded-md hover:bg-slate-100 transition">
            ← Back to Dashboard
          </Link>
        </div>

        {isSubmitted ? (
          <div className="bg-white p-8 rounded-lg border text-center space-y-4 shadow-sm animate-in fade-in duration-300">
            {submitResult?.emailSent ? (
              <>
                <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                  Request submitted. Approval link sent to {submitResult.recipientEmail}.
                </h2>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                  ✓
                </div>
                <h2 className="text-xl font-bold text-slate-800">Leave Request Saved</h2>
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md max-w-md mx-auto">
                  Could not send the email: {submitResult?.emailError || "Unknown error"}
                </div>
              </>
            )}
            <div className="pt-2">
              <Link href="/student/dashboard" className="inline-block px-5 py-2.5 bg-[#0A192F] text-white rounded-md text-sm font-medium hover:bg-slate-800 transition">
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Leave Type */}
            <div className="bg-white p-5 rounded-lg border shadow-sm space-y-2">
              <label htmlFor="leaveTypeSelect" className="block text-sm font-semibold text-slate-700">
                Leave Type
              </label>
              <select
                id="leaveTypeSelect"
                value={leaveType}
                onChange={(e) => handleLeaveTypeChange(e.target.value)}
                className="w-full sm:w-80 p-2.5 border border-slate-300 rounded-md bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
              >
                <option value="" disabled>Select leave type</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Diwali Vacation">Diwali Vacation</option>
                <option value="Summer Vacation">Summer Vacation</option>
              </select>
              {!leaveType && (
                <p className="text-xs text-slate-500">Select a leave type to upload your slip</p>
              )}
            </div>

            {/* Step 2: Upload Dropzone */}
            <div className={`bg-white p-6 rounded-lg border shadow-sm transition-opacity ${!leaveType ? "opacity-50" : ""}`}>
              <h2 className="text-base font-semibold text-slate-800 mb-1">
                Upload Physical Parent Signed Leave Application
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Upload clear image of the physical booklet leave slip
              </p>

              <div
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
                  !leaveType
                    ? "border-slate-200 bg-slate-100 cursor-not-allowed"
                    : "border-slate-300 bg-slate-50"
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  disabled={!leaveType || loading}
                  onChange={handleFileChange}
                  className={`block w-full max-w-md text-sm text-slate-500
                    file:mr-4 file:py-2.5 file:px-5
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[#0A192F] file:text-white
                    hover:file:bg-slate-800 file:cursor-pointer
                    cursor-pointer bg-white p-2 border rounded-md ${
                      !leaveType ? "cursor-not-allowed opacity-60" : ""
                    }`}
                />
              </div>
            </div>

            {/* Scanning State */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-blue-900 font-medium">
                <svg
                  className="animate-spin h-5 w-5 text-blue-900"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span>Scanning...</span>
              </div>
            )}

            {scanMessage && !loading && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-base leading-none">⚠️</span>
                  <div>
                    <div className="font-semibold">Notice</div>
                    <div className="mt-0.5">{scanMessage}</div>
                  </div>
                </div>
                {lastUploadedFileRef.current && (
                  <button
                    type="button"
                    onClick={handleTryAgain}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded bg-[#0A192F] text-white hover:bg-slate-800 transition shadow-sm"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Verification View */}
            {imagePreview && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg border shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Leave Application Image</h3>
                  <div className="border rounded-md overflow-hidden bg-slate-100 max-h-[500px] flex items-center justify-center p-2">
                    <img
                      src={imagePreview}
                      alt="Uploaded Application"
                      className="max-h-[480px] w-auto object-contain rounded"
                    />
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Leave Application Verification</h3>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-xs font-semibold px-3 py-1.5 rounded border border-[#0A192F] text-[#0A192F] hover:bg-slate-100 transition"
                    >
                      {isEditing ? "✓ Lock Details" : "✏️ Edit Details"}
                    </button>
                  </div>

                  {submitError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{submitError}</span>
                    </div>
                  )}

                  {mismatchWarning && (
                    <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-md flex items-start gap-2 shadow-sm animate-in fade-in">
                      <span className="text-sm font-bold leading-none">⚠️</span>
                      <div className="leading-relaxed">
                        <span className="font-semibold">Notice: </span>
                        {mismatchWarning}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 text-sm">
                    <div>
                      <label className="block text-xs font-medium text-slate-500">Roll Number</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.rollNumber}
                        onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                        placeholder={isEditing ? "Enter roll number" : "(Scanned from slip)"}
                        className="w-full mt-1 p-2 border rounded disabled:bg-slate-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500">Student ID</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={formData.studentId}
                          onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                          placeholder={isEditing ? "Enter student ID" : "(Scanned from slip)"}
                          className="w-full mt-1 p-2 border rounded disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500">Hostel</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={formData.hostel}
                          onChange={(e) => setFormData({ ...formData, hostel: e.target.value })}
                          placeholder={isEditing ? "Enter hostel name" : "(Scanned from slip)"}
                          className="w-full mt-1 p-2 border rounded disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500">Class</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={formData.className}
                          onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                          placeholder={isEditing ? "Enter class" : "(Scanned from slip)"}
                          className="w-full mt-1 p-2 border rounded disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500">No. of Days</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={formData.days}
                          onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                          placeholder={isEditing ? "Enter days" : "(Scanned from slip)"}
                          className="w-full mt-1 p-2 border rounded disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500">From Date</label>
                        <input
                          type="date"
                          disabled={!isEditing}
                          value={formData.fromDate}
                          onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                          className="w-full mt-1 p-2 border rounded disabled:bg-slate-100"
                          placeholder="YYYY-MM-DD"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500">To Date</label>
                        <input
                          type="date"
                          disabled={!isEditing}
                          value={formData.toDate}
                          onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                          className="w-full mt-1 p-2 border rounded disabled:bg-slate-100"
                          placeholder="YYYY-MM-DD"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500">Destination Address</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.destination}
                        onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                        placeholder={isEditing ? "Enter destination address" : "(Scanned from slip)"}
                        className="w-full mt-1 p-2 border rounded disabled:bg-slate-100"
                      />
                    </div>

                    {leaveType === "Casual Leave" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500">Reason of Applying for Leave</label>
                        <input
                          type="text"
                          disabled={!isEditing}
                          value={formData.reason}
                          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                          placeholder={isEditing ? "Enter leave reason" : "(Scanned from slip)"}
                          className="w-full mt-1 p-2 border rounded disabled:bg-slate-100"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-4 py-2.5 bg-[#0A192F] text-white font-medium rounded-md hover:bg-slate-800 transition shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting Application..." : "Submit Leave Application"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
