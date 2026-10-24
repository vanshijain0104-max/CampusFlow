import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

export const dynamic = "force-dynamic";

// 3 DIFFERENT Flash / Flash-Lite models on the Google AI Free Tier with active available quota
const OCR_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
];

const MAX_TOTAL_ATTEMPTS = 5;
const PER_ATTEMPT_TIMEOUT_MS = 45000;

function getStatusCode(err: any): number {
  if (!err) return 500;
  const status = err.status || err.code || err.statusCode;
  if (typeof status === "number" && status >= 400 && status < 600) return status;
  const msg = (err.message || "").toLowerCase();
  if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("rate limit")) return 429;
  if (msg.includes("403") || msg.includes("permission_denied") || msg.includes("forbidden") || msg.includes("api_key_invalid")) return 403;
  if (msg.includes("404") || msg.includes("not found")) return 404;
  if (msg.includes("timeout") || msg.includes("exceeded")) return 504;
  return 500;
}

function parseGeminiJson(responseText: string): {
  fromDate: string;
  toDate: string;
  destination: string;
  reason: string;
  rollNumber: string;
  studentId: string;
  hostel: string;
  className: string;
  days: string;
} {
  const cleanedJson = responseText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  let extracted: any = {};
  try {
    extracted = JSON.parse(cleanedJson);
  } catch {
    const match = cleanedJson.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        extracted = JSON.parse(match[0]);
      } catch {
        extracted = {};
      }
    }
  }

  return {
    fromDate: typeof extracted?.fromDate === "string" ? extracted.fromDate.trim() : "",
    toDate: typeof extracted?.toDate === "string" ? extracted.toDate.trim() : "",
    destination: typeof extracted?.destination === "string" ? extracted.destination.trim() : "",
    reason: typeof extracted?.reason === "string" ? extracted.reason.trim() : "",
    rollNumber: typeof extracted?.rollNumber === "string" ? extracted.rollNumber.trim() : "",
    studentId: typeof extracted?.studentId === "string" ? extracted.studentId.trim() : "",
    hostel: typeof extracted?.hostel === "string" ? extracted.hostel.trim() : "",
    className: typeof extracted?.className === "string" ? extracted.className.trim() : "",
    days: typeof extracted?.days === "string" ? extracted.days.trim() : "",
  };
}

function getFieldCounts(data: {
  fromDate?: string;
  toDate?: string;
  destination?: string;
  reason?: string;
  rollNumber?: string;
  studentId?: string;
  hostel?: string;
  className?: string;
  days?: string;
}) {
  const isFilled = (val?: string) => Boolean(val && val.trim() !== "");
  const filled = [
    isFilled(data.fromDate),
    isFilled(data.toDate),
    isFilled(data.destination),
    isFilled(data.reason),
    isFilled(data.rollNumber),
    isFilled(data.studentId),
    isFilled(data.hostel),
    isFilled(data.className),
    isFilled(data.days),
  ].filter(Boolean).length;
  const empty = 9 - filled;
  return { filled, empty };
}

async function callModelWithTimeout(
  ai: GoogleGenAI,
  modelName: string,
  prompt: string,
  mimeType: string,
  base64Data: string,
  timeoutMs = PER_ATTEMPT_TIMEOUT_MS
): Promise<{ text: string; is429: boolean; status?: number; error?: string; durationMs: number }> {
  const startTime = Date.now();
  const contents = [
    {
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Data } },
      ],
    },
  ];

  const isLite = modelName.toLowerCase().includes("lite");
  const config: any = {
    temperature: 0,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        fromDate: { type: Type.STRING },
        toDate: { type: Type.STRING },
        destination: { type: Type.STRING },
        reason: { type: Type.STRING },
        rollNumber: { type: Type.STRING },
        studentId: { type: Type.STRING },
        hostel: { type: Type.STRING },
        className: { type: Type.STRING },
        days: { type: Type.STRING },
      },
      required: [
        "fromDate",
        "toDate",
        "destination",
        "reason",
        "rollNumber",
        "studentId",
        "hostel",
        "className",
        "days",
      ],
    },
  };

  // Keep thinking OFF for the Gemini call (thinkingBudget 0 or equivalent)
  if (!isLite) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  try {
    const responsePromise = ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Server timeout: ${modelName} exceeded ${timeoutMs / 1000}s limit`)),
        timeoutMs
      )
    );

    const response = (await Promise.race([responsePromise, timeoutPromise])) as any;
    const durationMs = Date.now() - startTime;
    const rawText = response?.text || "{}";

    console.log(`[OCR ATTEMPT] Model: ${modelName} | Time: ${durationMs}ms | Result: SUCCESS`);
    return { text: rawText, is429: false, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const status = getStatusCode(err);
    const errMsg = err?.message || "Model call failed";

    console.log(`[OCR ATTEMPT] Model: ${modelName} | Time: ${durationMs}ms | Result: FAILED [HTTP ${status}] - ${errMsg}`);
    return {
      text: "",
      is429: status === 429,
      status,
      error: errMsg,
      durationMs,
    };
  }
}

export async function POST(req: NextRequest) {
  const totalStartTime = Date.now();
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No image file provided",
          data: {
            fromDate: "",
            toDate: "",
            destination: "",
            reason: "",
            rollNumber: "",
            studentId: "",
            hostel: "",
            className: "",
            days: "",
          },
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      console.error("[OCR] GEMINI_API_KEY is not configured in environment");
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY is not configured in .env.local",
          data: {
            fromDate: "",
            toDate: "",
            destination: "",
            reason: "",
            rollNumber: "",
            studentId: "",
            hostel: "",
            className: "",
            days: "",
          },
        },
        { status: 500 }
      );
    }

    const prompt =
      "This is a photo of a Banasthali Vidyapith hostel Mid-Term/Summer Vacation Application Form. " +
      "Most text is printed (Hindi + English); only the filled-in parts are handwritten. " +
      "Read ONLY what is actually handwritten on this page. Extract: " +
      "(1) 'Date of going on leave' as fromDate, " +
      "(2) the date after 'from'/'to' as toDate (the form also has a 'Days' number: use it to cross-check, toDate = fromDate + Days), " +
      "(3) 'Reason of applying for Leave' as reason, " +
      "(4) the guardian's address near the bottom (before 'Phone No') as destination. " +
      "Dates are DD-MM-YY Indian format; output YYYY-MM-DD, assume 20YY. " +
      "Also extract: 'Roll No.' (printed label, value handwritten, format like 241H0320XXX) as rollNumber, " +
      "'ID No.' (format like BTBTC24XXX) as studentId, and the handwritten 'Hostel Name' as hostel. " +
      "Copy exactly what is written, uppercase is fine. " +
      "If a field is not clearly readable, return an empty string. Never guess, never invent, never use example values. " +
      "Also extract: the handwritten value next to 'Class' as className (copy exactly as written), and the handwritten number next to the printed word 'Days' in the leave dates row as days (digits only). If not clearly readable, return an empty string. Never guess and never calculate it.";

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

    let attemptCount = 0;
    let successfulResult: { text: string; model: string } | null = null;
    let lastError: { status: number; message: string; model: string } | null = null;

    // Pass 1: Try the 3 models one after another immediately on error/timeout
    for (let i = 0; i < OCR_MODELS.length && attemptCount < MAX_TOTAL_ATTEMPTS; i++) {
      const model = OCR_MODELS[i];
      attemptCount++;
      console.log(`[OCR] Pass 1 - Attempt ${attemptCount}/${MAX_TOTAL_ATTEMPTS} with ${model}...`);
      const res = await callModelWithTimeout(ai, model, prompt, mimeType, base64Data, PER_ATTEMPT_TIMEOUT_MS);

      if (res.text && !res.error) {
        successfulResult = { text: res.text, model };
        break;
      }
      lastError = { status: res.status || 500, message: res.error || "Model call failed", model };
    }

    // If all 3 models failed, wait 2 seconds and run the chain once more (up to 5 attempts maximum in total)
    if (!successfulResult && attemptCount < MAX_TOTAL_ATTEMPTS) {
      console.log("[OCR] All models in initial pass failed. Waiting 2s before retry pass...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      for (let i = 0; i < OCR_MODELS.length && attemptCount < MAX_TOTAL_ATTEMPTS; i++) {
        const model = OCR_MODELS[i];
        attemptCount++;
        console.log(`[OCR] Pass 2 - Attempt ${attemptCount}/${MAX_TOTAL_ATTEMPTS} with ${model}...`);
        const res = await callModelWithTimeout(ai, model, prompt, mimeType, base64Data, PER_ATTEMPT_TIMEOUT_MS);

        if (res.text && !res.error) {
          successfulResult = { text: res.text, model };
          break;
        }
        lastError = { status: res.status || 500, message: res.error || "Model call failed", model };
      }
    }

    if (!successfulResult) {
      const totalDuration = Date.now() - totalStartTime;
      console.error(
        `[OCR] All ${attemptCount} attempts failed in ${totalDuration}ms. Last error (${lastError?.model}): [HTTP ${lastError?.status}] ${lastError?.message}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Scanning is busy right now. Please try again in a minute, or click Edit Details to fill the form manually.",
          data: {
            fromDate: "",
            toDate: "",
            destination: "",
            reason: "",
            rollNumber: "",
            studentId: "",
            hostel: "",
            className: "",
            days: "",
          },
        },
        { status: lastError?.status || 503 }
      );
    }

    const extractedData = parseGeminiJson(successfulResult.text);
    const { filled } = getFieldCounts(extractedData);
    const totalDuration = Date.now() - totalStartTime;

    console.log(
      `[OCR] Completed in ${totalDuration}ms | Model used: ${successfulResult.model} | Fields filled: ${filled}/9`
    );

    return NextResponse.json({
      success: true,
      data: extractedData,
      modelUsed: successfulResult.model,
      fieldsFilled: filled,
      durationMs: totalDuration,
    });
  } catch (error: any) {
    const totalDuration = Date.now() - totalStartTime;
    console.error(`[OCR] Unhandled error in ${totalDuration}ms:`, error?.message || error);
    const status = getStatusCode(error);
    return NextResponse.json(
      {
        success: false,
        error: "Scanning is busy right now. Please try again in a minute, or click Edit Details to fill the form manually.",
        data: {
          fromDate: "",
          toDate: "",
          destination: "",
          reason: "",
          rollNumber: "",
          studentId: "",
          hostel: "",
          className: "",
          days: "",
        },
      },
      { status }
    );
  }
}
