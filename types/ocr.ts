/**
 * CampusFlow — OCR Types
 * types/ocr.ts
 *
 * Lightweight TypeScript interfaces for OCR data exchange.
 * Keeps server OCR modules (tesseract.js, sharp) decoupled from client components.
 */

export interface ParsedSlipData {
  rollNo?: string;
  studentId?: string;
  studentName?: string;
  hostelName?: string;
  degreeBranch?: string;
  bookletType: "NORMAL" | "DIWALI" | "SUMMER";
  fromDate?: string;
  toDate?: string;
  destination?: string;
  guardianAddress?: string;
  reason?: string;
  rawText: string;
  confidence: number;
}


