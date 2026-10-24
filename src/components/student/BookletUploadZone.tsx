"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, CheckCircle, RefreshCw } from "lucide-react";

export interface BookletUploadZoneProps {
  onImageSelected: (file: File | null, previewUrl: string | null, sampleName?: string) => void;
  isLoading?: boolean;
}

const SAMPLE_SLIPS = [
  { id: "slip_priya.png", label: "Priya Singh", meta: "Roll: 241H0320145 · Casual Leave" },
  { id: "slip_ananya.png", label: "Ananya Sharma", meta: "Roll: 241H0320188 · Casual Leave" },
  { id: "slip_sneha.png", label: "Sneha Verma", meta: "Roll: 241H0320215 · Diwali Vacation" },
  { id: "slip_kavya.png", label: "Kavya Joshi", meta: "Roll: 241H0320245 · Diwali Vacation" },
  { id: "slip_megha.png", label: "Megha Gupta", meta: "Roll: 241H0320278 · Summer Vacation" },
];

export default function BookletUploadZone({
  onImageSelected,
  isLoading = false,
}: BookletUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid JPEG or PNG image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size exceeds 5MB limit.");
      return;
    }
    setSelectedFileName(file.name);
    const previewUrl = URL.createObjectURL(file);
    onImageSelected(file, previewUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const loadSample = async (sampleId: string, label: string) => {
    try {
      const res = await fetch(`/sample-slips/${sampleId}`);
      const blob = await res.blob();
      const file = new File([blob], sampleId, { type: "image/png" });
      setSelectedFileName(`${label} (${sampleId})`);
      const previewUrl = `/sample-slips/${sampleId}`;
      onImageSelected(file, previewUrl, sampleId);
    } catch (err) {
      console.error("Failed to load sample:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Dropzone Card ── */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors duration-150 ${
          dragActive
            ? "border-[#1E4080] bg-blue-50/60"
            : "border-slate-300 hover:border-[#1E4080] bg-slate-50/70"
        } ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs mb-3 text-[#0A192F]">
          {isLoading ? (
            <RefreshCw className="w-6 h-6 animate-spin text-[#1E4080]" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <p className="text-sm font-semibold text-[#0A192F]">
          {isLoading ? "Analyzing slip image..." : "Upload Physical Leave Slip"}
        </p>
        <p className="text-xs text-slate-500 mt-1 text-center">
          Drag and drop your slip image here, or browse files (PNG, JPEG up to 5MB)
        </p>

        {selectedFileName && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#0A192F] text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-blue-700" />
            <span>Selected: {selectedFileName}</span>
          </div>
        )}
      </div>

      {/* ── Quick-Test Selector Toolbar ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon className="w-4 h-4 text-[#1E4080]" />
          <span className="text-xs font-semibold text-[#0A192F] uppercase tracking-wider">
            Quick-Test Benchmark Slips (1-Click Test)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {SAMPLE_SLIPS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={isLoading}
              onClick={() => loadSample(sample.id, sample.label)}
              className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-[#1E4080] hover:bg-slate-50 transition-all text-xs focus:outline-none focus:ring-1 focus:ring-[#1E4080] disabled:opacity-50"
            >
              <div className="font-semibold text-[#0A192F] truncate">{sample.label}</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">{sample.meta}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
