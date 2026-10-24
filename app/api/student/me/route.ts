import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { findStudentByIdentifier, VERIFIED_STUDENTS } from "@/lib/db/leaves-store";
import { prisma, withDbTimeout } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ authenticated: false, student: null });
  }

  console.log("[STUDENT ME] Logged-in session user:", JSON.stringify(session.user));

  const userEmail = session.user.email || "";
  const userRoll = session.user.rollNumber || "";
  const userStudentId = session.user.studentId || "";
  const userId = session.user.id || "";

  // 1. Try DB lookup if PostgreSQL is reachable
  let dbStudent: any = null;
  try {
    dbStudent = await withDbTimeout(
      prisma.student.findFirst({
        where: {
          OR: [
            userRoll ? { rollNumber: { equals: userRoll, mode: "insensitive" } } : undefined,
            userStudentId ? { studentId: { equals: userStudentId, mode: "insensitive" } } : undefined,
            userEmail ? { user: { email: { equals: userEmail, mode: "insensitive" } } } : undefined,
          ].filter(Boolean) as any,
        },
        include: { hostel: true },
      }),
      400
    );
  } catch (err) {
    console.warn("[STUDENT ME] DB query skipped/failed, using local store:", (err as Error).message);
  }

  // 2. Look up in verified student store matching session credentials (no hardcoded default student!)
  const localStudent =
    (userRoll ? findStudentByIdentifier(userRoll) : undefined) ||
    (userStudentId ? findStudentByIdentifier(userStudentId) : undefined) ||
    (userEmail ? VERIFIED_STUDENTS.find((s) => s.email.toLowerCase() === userEmail.toLowerCase()) : undefined) ||
    (userId ? findStudentByIdentifier(userId) : undefined);

  const rollNumber = dbStudent?.rollNumber || localStudent?.rollNumber || userRoll || "";
  const studentId = dbStudent?.studentId || localStudent?.studentId || userStudentId || "";
  const fullName = dbStudent?.fullName || localStudent?.fullName || session.user.name || "Student";
  const hostel = dbStudent?.hostel?.name || localStudent?.hostelName || "";
  const branch = dbStudent?.branch || localStudent?.branch || "CSE";

  return NextResponse.json({
    authenticated: true,
    student: {
      rollNumber,
      studentId,
      fullName,
      hostel,
      branch,
      email: userEmail,
    },
  });
}
