"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, CheckCircle, RefreshCw } from "lucide-react";

export interface BookletUploadZoneProps {
  onImageSelected: (file: File | null, previewUrl: string | null) => void;
  isLoading?: boolean;
}

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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      {/* ── Strict Header ── */}
      <div>
        <h2 className="text-base font-bold text-[#0A192F]">
          Upload Physical Parent Signed Leave Application
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Attach a clear scan or photograph of the completed and signed leave application form.
        </p>
      </div>

      {/* ── Dropzone Card ── */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors duration-150 ${
          dragActive
            ? "border-[#1E4080] bg-blue-50/60"
            : "border-slate-300 hover:border-[#1E4080] bg-slate-50/70"
        } ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs mb-3 text-[#0A192F]">
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin text-[#1E4080]" />
          ) : selectedFileName ? (
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          ) : (
            <UploadCloud className="w-6 h-6 text-[#1E4080]" />
          )}
        </div>

        <p className="text-sm font-semibold text-slate-800">
          {selectedFileName ? (
            <span className="text-emerald-700 font-bold">{selectedFileName}</span>
          ) : (
            <>
              Drag and drop slip image here, or{" "}
              <span className="text-[#1E4080] underline font-bold">browse your computer</span>
            </>
          )}
        </p>

        <p className="text-xs text-slate-500 mt-1 mb-4">Supports PNG, JPG, or JPEG up to 5MB</p>

        {/* Large explicit visible button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          disabled={isLoading}
          className="px-5 py-2.5 bg-[#0A192F] hover:bg-[#1E4080] text-white rounded-xl text-xs font-bold tracking-wide shadow-sm transition flex items-center gap-2"
        >
          <UploadCloud className="w-4 h-4 text-blue-300" />
          <span>{selectedFileName ? "Change Slip Image" : "Choose Slip Image / Browse Files"}</span>
        </button>
      </div>
    </div>
  );
}
