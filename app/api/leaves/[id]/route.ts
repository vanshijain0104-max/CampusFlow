import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteLeaveRecord } from "@/lib/db/leaves-store";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing leave ID" }, { status: 400 });
    }

    const studentRollOrId =
      session.user.rollNumber || session.user.studentId || session.user.id || "";

    const result = await deleteLeaveRecord({
      leaveId: id,
      studentRollOrId,
      userId: session.user.id,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete leave request." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Leave request deleted",
    });
  } catch (error) {
    console.error("Error deleting leave:", error);
    return NextResponse.json(
      { error: "Internal server error deleting leave request." },
      { status: 500 }
    );
  }
}
