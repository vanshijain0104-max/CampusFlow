/**
 * CampusFlow — Parent Audit Lock API
 * app/api/parent/authorize/route.ts
 *
 * Implements Phase 4 Specification:
 * 1. Receives action ('APPROVE' or 'REJECT'), token, and optional remarks.
 * 2. Enforces single-use locking and atomic transition:
 *    - If APPROVE: Status -> 'PENDING_WARDEN_1', parentApprovedAt = now, records IP, token invalidated.
 *    - If REJECT:  Status -> 'REJECTED_PARENT', rejectionNote = remarks, records IP, token invalidated.
 * 3. Returns confirmation payload for zero-login mobile screen.
 */

import { NextRequest, NextResponse } from "next/server";
import { authorizeParentConsent } from "@/lib/db/leaves-store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, action, remarks } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Authorization token is missing or malformed." },
        { status: 400 }
      );
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Invalid action. Permitted actions: 'APPROVE' or 'REJECT'." },
        { status: 400 }
      );
    }

    const finalRemarks = remarks?.trim() || (action === "REJECT" ? "Denied by parent" : undefined);

    // Extract client IP address from request headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "127.0.0.1";

    const result = await authorizeParentConsent({
      token: token.trim(),
      action,
      ipAddress: clientIp,
      remarks: finalRemarks,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          status: result.status,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      message: result.message,
      leaveId: result.leave?.id,
      parentApprovedAt: result.leave?.parentApprovedAt,
      ipRecorded: clientIp,
    });
  } catch (error) {
    console.error("Parent Authorization Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process parent authorization.",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
