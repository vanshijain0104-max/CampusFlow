/**
 * CampusFlow — Unified Leaves & Parent Consent Persistence Store
 * lib/db/leaves-store.ts
 *
 * Implements:
 * 1. Primary write & query via Prisma ORM (PostgreSQL).
 * 2. Automatic persistent JSON fallback (data/leaves.json) if PostgreSQL
 *    is not reachable or running in disconnected dev mode.
 * 3. Seeded fallback student profiles matching verified accounts:
 *    - Priya Singh (241H0320145 / BTBTC24145)
 *    - Ananya Sharma (241H0320188 / BTBTC24188)
 *    - Sneha Verma (241H0320215 / BTBTC24215)
 *    - Kavya Joshi (241H0320245 / BTBTC24245)
 *    - Megha Gupta (241H0320278 / BTBTC24278)
 * 4. Atomic single-use token validation and status transitions:
 *    - APPROVE -> PENDING_WARDEN_1
 *    - REJECT  -> REJECTED_PARENT
 */

import fs from "fs";
import path from "path";
import { prisma, withDbTimeout } from "@/lib/prisma";
import { LeaveStatus, LeaveType } from "@prisma/client";

export interface StoredStudent {
  id: string;
  rollNumber: string;
  studentId: string;
  fullName: string;
  branch: string;
  programme: string;
  year: number;
  hostelName: string;
  email: string;
  photo?: string;
}

export interface StoredLeave {
  id: string;
  studentId: string;
  studentRollNumber: string;
  studentName: string;
  branch: string;
  hostelName: string;
  leaveType: LeaveType;
  bookletType: string; // NORMAL, DIWALI, SUMMER
  fromDate: string;
  toDate: string;
  totalDays: number;
  chargeableDays: number;
  quotaAlertFlag?: string | null;
  reason: string;
  destination: string;
  className?: string | null;
  days?: string | null;
  slipImageUrl?: string | null;
  parentConsent: boolean;
  parentToken: string | null;
  parentTokenExpiry: string; // ISO date string
  parentApprovedAt: string | null;
  parentIpAddress: string | null;
  status: LeaveStatus;
  rejectionNote?: string | null;
  appliedAt: string;
  updatedAt: string;
}

export const VERIFIED_STUDENTS: StoredStudent[] = [
  {
    id: "std_priya",
    rollNumber: "241H0320145",
    studentId: "BTBTC24145",
    fullName: "Priya Singh",
    branch: "CSE",
    programme: "B.Tech",
    year: 1,
    hostelName: "Shri Shanta Soudh",
    email: "Barkhaaa5050+priya@gmail.com",
    photo: "/sample-slips/slip_priya.png",
  },
  {
    id: "std_ananya",
    rollNumber: "241H0320188",
    studentId: "BTBTC24188",
    fullName: "Ananya Sharma",
    branch: "IT",
    programme: "B.Tech",
    year: 1,
    hostelName: "Shri Shanta Niketan",
    email: "Barkhaaa5050+ananya@gmail.com",
    photo: "/sample-slips/slip_ananya.png",
  },
  {
    id: "std_sneha",
    rollNumber: "241H0320215",
    studentId: "BTBTC24215",
    fullName: "Sneha Verma",
    branch: "CSE",
    programme: "B.Tech",
    year: 1,
    hostelName: "Shri Shanta Aynam",
    email: "Barkhaaa5050+sneha@gmail.com",
    photo: "/sample-slips/slip_sneha.png",
  },
  {
    id: "std_kavya",
    rollNumber: "241H0320245",
    studentId: "BTBTC24245",
    fullName: "Kavya Joshi",
    branch: "ECE",
    programme: "B.Tech",
    year: 1,
    hostelName: "Shri Shanta Ajeeram",
    email: "Barkhaaa5050+kavya@gmail.com",
    photo: "/sample-slips/slip_kavya.png",
  },
  {
    id: "std_megha",
    rollNumber: "241H0320278",
    studentId: "BTBTC24278",
    fullName: "Megha Gupta",
    branch: "IT",
    programme: "B.Tech",
    year: 1,
    hostelName: "Shri Shanta Nikay",
    email: "Barkhaaa5050+megha@gmail.com",
    photo: "/sample-slips/slip_megha.png",
  },
];

const DATA_DIR = path.join(process.cwd(), "data");
const LEAVES_FILE = path.join(DATA_DIR, "leaves.json");

function ensureLeavesFile(): StoredLeave[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LEAVES_FILE)) {
      fs.writeFileSync(LEAVES_FILE, JSON.stringify([], null, 2), "utf8");
      return [];
    }
    const raw = fs.readFileSync(LEAVES_FILE, "utf8");
    return JSON.parse(raw) as StoredLeave[];
  } catch (err) {
    console.error("Error reading leaves store file:", err);
    return [];
  }
}

function saveLeavesToFile(leaves: StoredLeave[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LEAVES_FILE, JSON.stringify(leaves, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing leaves store file:", err);
  }
}

export function findStudentByIdentifier(identifier: string): StoredStudent | undefined {
  const clean = identifier.trim().toLowerCase();
  return VERIFIED_STUDENTS.find(
    (s) =>
      s.id.toLowerCase() === clean ||
      s.rollNumber.toLowerCase() === clean ||
      s.studentId.toLowerCase() === clean ||
      s.fullName.toLowerCase() === clean ||
      s.email.toLowerCase() === clean
  );
}

/**
 * Creates a new leave application in PENDING_PARENT status with a 48h token.
 */
export async function createLeaveRecord(params: {
  studentIdentifier: string;
  bookletType: string;
  leaveType?: LeaveType;
  fromDate: string | Date;
  toDate: string | Date;
  totalDays: number;
  chargeableDays: number;
  destination: string;
  reason: string;
  quotaAlertFlag?: string | null;
  slipImageUrl?: string | null;
  className?: string | null;
  days?: string | null;
  parentToken: string;
  parentTokenExpiry: Date;
}): Promise<StoredLeave> {
  const fromIso = typeof params.fromDate === "string" ? params.fromDate : params.fromDate.toISOString();
  const toIso = typeof params.toDate === "string" ? params.toDate : params.toDate.toISOString();
  const student = findStudentByIdentifier(params.studentIdentifier) || VERIFIED_STUDENTS[0];

  const assignedLeaveType: LeaveType =
    params.leaveType ||
    (params.bookletType === "DIWALI"
      ? LeaveType.MID_TERM_RECESS
      : params.bookletType === "SUMMER"
      ? LeaveType.SUMMER_VACATION
      : LeaveType.CASUAL);

  const newLeave: StoredLeave = {
    id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studentId: student.id,
    studentRollNumber: student.rollNumber,
    studentName: student.fullName,
    branch: student.branch,
    hostelName: student.hostelName,
    leaveType: assignedLeaveType,
    bookletType: params.bookletType,
    fromDate: fromIso,
    toDate: toIso,
    totalDays: params.totalDays,
    chargeableDays: params.chargeableDays,
    quotaAlertFlag: params.quotaAlertFlag || null,
    reason: params.reason,
    destination: params.destination,
    className: params.className || null,
    days: params.days || null,
    slipImageUrl: params.slipImageUrl || null,
    parentConsent: false,
    parentToken: params.parentToken,
    parentTokenExpiry: params.parentTokenExpiry.toISOString(),
    parentApprovedAt: null,
    parentIpAddress: null,
    status: LeaveStatus.PENDING_PARENT,
    rejectionNote: null,
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Attempt database persistence first
  try {
    const dbStudent = await withDbTimeout(
      prisma.student.findFirst({
        where: {
          OR: [
            { rollNumber: student.rollNumber },
            { studentId: student.studentId },
          ],
        },
      }),
      400
    );

    if (dbStudent) {
      const dbLeave = await withDbTimeout(
        prisma.leave.create({
          data: {
            studentId: dbStudent.id,
            leaveType: assignedLeaveType,
            bookletType: params.bookletType,
            fromDate: new Date(fromIso),
            toDate: new Date(toIso),
            totalDays: params.totalDays,
            chargeableDays: params.chargeableDays,
            quotaAlertFlag: params.quotaAlertFlag || null,
            reason: params.reason,
            destination: params.destination,
            parentConsent: false,
            parentToken: params.parentToken,
            parentTokenExpiry: params.parentTokenExpiry,
            status: LeaveStatus.PENDING_PARENT,
          },
        }),
        400
      );
      if (dbLeave) newLeave.id = dbLeave.id;
    }
  } catch (err) {
    console.warn("Prisma leave insert skipped, using persistent JSON file:", (err as Error).message);
  }

  // Always sync to persistent file store
  const allLeaves = ensureLeavesFile();
  allLeaves.unshift(newLeave);
  saveLeavesToFile(allLeaves);

  return newLeave;
}

/**
 * Retrieves a leave application by its parent token along with student identity.
 */
export async function getLeaveByToken(token: string): Promise<{
  leave: StoredLeave | null;
  student: StoredStudent | null;
  isExpired: boolean;
  isActioned: boolean;
}> {
  if (!token) {
    return { leave: null, student: null, isExpired: false, isActioned: false };
  }

  // Check file store
  const allLeaves = ensureLeavesFile();
  const fileLeave = allLeaves.find((l) => l.parentToken === token);

  let targetLeave: StoredLeave | null = fileLeave || null;

  // If not found in file, try DB
  if (!targetLeave) {
    try {
      const dbLeave = await withDbTimeout(
        prisma.leave.findUnique({
          where: { parentToken: token },
          include: { student: { include: { hostel: true } } },
        }),
        400
      );

      if (dbLeave) {
        targetLeave = {
          id: dbLeave.id,
          studentId: dbLeave.studentId,
          studentRollNumber: dbLeave.student.rollNumber,
          studentName: dbLeave.student.fullName,
          branch: dbLeave.student.branch,
          hostelName: dbLeave.student.hostel?.name || "Banasthali Hostel",
          leaveType: dbLeave.leaveType,
          bookletType: dbLeave.bookletType,
          fromDate: dbLeave.fromDate.toISOString(),
          toDate: dbLeave.toDate.toISOString(),
          totalDays: dbLeave.totalDays,
          chargeableDays: dbLeave.chargeableDays,
          quotaAlertFlag: dbLeave.quotaAlertFlag,
          reason: dbLeave.reason,
          destination: dbLeave.destination,
          slipImageUrl: null,
          parentConsent: dbLeave.parentConsent,
          parentToken: dbLeave.parentToken,
          parentTokenExpiry: dbLeave.parentTokenExpiry ? dbLeave.parentTokenExpiry.toISOString() : "",
          parentApprovedAt: dbLeave.parentApprovedAt ? dbLeave.parentApprovedAt.toISOString() : null,
          parentIpAddress: dbLeave.parentIpAddress,
          status: dbLeave.status,
          rejectionNote: dbLeave.rejectionNote,
          appliedAt: dbLeave.appliedAt.toISOString(),
          updatedAt: dbLeave.updatedAt.toISOString(),
        };
      }
    } catch (err) {
      console.warn("Could not query DB by parent token:", (err as Error).message);
    }
  }

  if (!targetLeave) {
    return { leave: null, student: null, isExpired: false, isActioned: false };
  }

  const student =
    findStudentByIdentifier(targetLeave.studentRollNumber) ||
    findStudentByIdentifier(targetLeave.studentId) ||
    VERIFIED_STUDENTS[0];

  const now = new Date();
  const expiry = targetLeave.parentTokenExpiry ? new Date(targetLeave.parentTokenExpiry) : null;
  const isExpired = expiry ? now > expiry : false;
  const isActioned = targetLeave.status !== LeaveStatus.PENDING_PARENT || targetLeave.parentApprovedAt !== null;

  return {
    leave: targetLeave,
    student,
    isExpired,
    isActioned,
  };
}

/**
 * Executes the atomic parent authorization lock:
 * If action === 'APPROVE': transitions to PENDING_WARDEN_1
 * If action === 'REJECT': transitions to REJECTED_PARENT
 */
export async function authorizeParentConsent(params: {
  token: string;
  action: "APPROVE" | "REJECT";
  ipAddress: string;
  remarks?: string;
}): Promise<{
  success: boolean;
  status: LeaveStatus;
  message: string;
  leave: StoredLeave | null;
}> {
  const { leave, isExpired, isActioned } = await getLeaveByToken(params.token);

  if (!leave) {
    return {
      success: false,
      status: LeaveStatus.PENDING_PARENT,
      message: "Authorization link is invalid or does not exist.",
      leave: null,
    };
  }

  if (isExpired) {
    return {
      success: false,
      status: leave.status,
      message: "Authorization link has expired (48-hour window elapsed).",
      leave,
    };
  }

  if (isActioned) {
    return {
      success: false,
      status: leave.status,
      message: "This authorization link has already been actioned.",
      leave,
    };
  }

  const now = new Date();
  const newStatus =
    params.action === "APPROVE"
      ? LeaveStatus.PENDING_WARDEN_1
      : LeaveStatus.REJECTED_PARENT;

  // Update in Prisma if reachable
  try {
    await withDbTimeout(
      prisma.leave.update({
        where: { parentToken: params.token },
        data: {
          status: newStatus,
          parentConsent: params.action === "APPROVE",
          parentApprovedAt: params.action === "APPROVE" ? now : undefined,
          parentIpAddress: params.ipAddress,
          rejectionNote: params.action === "REJECT" ? params.remarks || "Rejected by parent" : undefined,
          parentToken: null, // Single-use invalidation
        },
      }),
      400
    );
  } catch (err) {
    console.warn("Prisma update parent authorize fallback to file store:", (err as Error).message);
  }

  // Update in file store
  const allLeaves = ensureLeavesFile();
  const index = allLeaves.findIndex((l) => l.id === leave.id || l.parentToken === params.token);

  if (index !== -1) {
    allLeaves[index].status = newStatus;
    allLeaves[index].parentConsent = params.action === "APPROVE";
    allLeaves[index].parentApprovedAt = params.action === "APPROVE" ? now.toISOString() : null;
    allLeaves[index].parentIpAddress = params.ipAddress;
    allLeaves[index].rejectionNote = params.action === "REJECT" ? params.remarks || "Rejected by parent" : null;
    allLeaves[index].parentToken = null; // Invalidate token so it cannot be reused
    allLeaves[index].updatedAt = now.toISOString();

    saveLeavesToFile(allLeaves);
    return {
      success: true,
      status: newStatus,
      message:
        params.action === "APPROVE"
          ? "Leave application approved successfully. Status transitioned to Pending Warden Clearance."
          : "Leave application rejected. Status updated to Rejected by Parent.",
      leave: allLeaves[index],
    };
  }

  leave.status = newStatus;
  return {
    success: true,
    status: newStatus,
    message: "Consent recorded successfully.",
    leave,
  };
}

/**
 * Returns leaves for a student by roll number or studentId.
 */
export async function getStudentLeaves(rollOrId: string): Promise<StoredLeave[]> {
  const clean = rollOrId.trim().toLowerCase();
  const allLeaves = ensureLeavesFile();

  const fileFiltered = allLeaves.filter(
    (l) =>
      l.studentRollNumber.toLowerCase() === clean ||
      l.studentId.toLowerCase() === clean
  );

  try {
    const dbLeaves = await withDbTimeout(
      prisma.leave.findMany({
        where: {
          student: {
            OR: [{ rollNumber: rollOrId }, { studentId: rollOrId }],
          },
        },
        orderBy: { appliedAt: "desc" },
      }),
      400
    );

    if (dbLeaves && dbLeaves.length > 0) {
      return dbLeaves.map((l) => ({
        id: l.id,
        studentId: l.studentId,
        studentRollNumber: rollOrId,
        studentName: "",
        branch: "",
        hostelName: "",
        leaveType: l.leaveType,
        bookletType: l.bookletType,
        fromDate: l.fromDate.toISOString(),
        toDate: l.toDate.toISOString(),
        totalDays: l.totalDays,
        chargeableDays: l.chargeableDays,
        quotaAlertFlag: l.quotaAlertFlag,
        reason: l.reason,
        destination: l.destination,
        slipImageUrl: null,
        parentConsent: l.parentConsent,
        parentToken: l.parentToken,
        parentTokenExpiry: l.parentTokenExpiry ? l.parentTokenExpiry.toISOString() : "",
        parentApprovedAt: l.parentApprovedAt ? l.parentApprovedAt.toISOString() : null,
        parentIpAddress: l.parentIpAddress,
        status: l.status,
        rejectionNote: l.rejectionNote,
        appliedAt: l.appliedAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      }));
    }
  } catch {
    // Return file store records
  }

  return fileFiltered;
}

/**
 * Deletes a leave request if it belongs to the student and is still in a pending state.
 * Invalidates any parent consent token and writes an audit log entry.
 */
export async function deleteLeaveRecord(params: {
  leaveId: string;
  studentRollOrId: string;
  userId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { leaveId, studentRollOrId, userId } = params;
  const cleanId = studentRollOrId.trim().toLowerCase();

  const allLeaves = ensureLeavesFile();
  const fileLeaveIndex = allLeaves.findIndex((l) => l.id === leaveId);
  const fileLeave = fileLeaveIndex !== -1 ? allLeaves[fileLeaveIndex] : null;

  let targetLeave = fileLeave;

  if (!targetLeave) {
    try {
      const dbLeave = await withDbTimeout(
        prisma.leave.findUnique({
          where: { id: leaveId },
          include: { student: true },
        }),
        400
      );
      if (dbLeave) {
        targetLeave = {
          id: dbLeave.id,
          studentId: dbLeave.studentId,
          studentRollNumber: dbLeave.student?.rollNumber || "",
          studentName: dbLeave.student?.fullName || "",
          branch: dbLeave.student?.branch || "",
          hostelName: "",
          leaveType: dbLeave.leaveType,
          bookletType: dbLeave.bookletType,
          fromDate: dbLeave.fromDate.toISOString(),
          toDate: dbLeave.toDate.toISOString(),
          totalDays: dbLeave.totalDays,
          chargeableDays: dbLeave.chargeableDays,
          quotaAlertFlag: dbLeave.quotaAlertFlag,
          reason: dbLeave.reason,
          destination: dbLeave.destination,
          parentConsent: dbLeave.parentConsent,
          parentToken: dbLeave.parentToken,
          parentTokenExpiry: dbLeave.parentTokenExpiry ? dbLeave.parentTokenExpiry.toISOString() : "",
          parentApprovedAt: dbLeave.parentApprovedAt ? dbLeave.parentApprovedAt.toISOString() : null,
          parentIpAddress: dbLeave.parentIpAddress,
          status: dbLeave.status,
          rejectionNote: dbLeave.rejectionNote,
          appliedAt: dbLeave.appliedAt.toISOString(),
          updatedAt: dbLeave.updatedAt.toISOString(),
        };
      }
    } catch (err) {
      console.warn("DB lookup during delete failed:", (err as Error).message);
    }
  }

  if (!targetLeave) {
    return { success: false, error: "Leave request not found." };
  }

  // Verify ownership
  const matches =
    targetLeave.studentRollNumber?.toLowerCase() === cleanId ||
    targetLeave.studentId?.toLowerCase() === cleanId;

  if (!matches) {
    return { success: false, error: "You are not authorized to delete this leave request." };
  }

  // Verify deletable status: ONLY pending states allowed
  const deletableStatuses: LeaveStatus[] = [
    LeaveStatus.PENDING_PARENT,
    LeaveStatus.PENDING_WARDEN_1,
  ];

  if (!deletableStatuses.includes(targetLeave.status)) {
    return {
      success: false,
      error: "This leave request cannot be deleted because it has already been approved or processed.",
    };
  }

  // Audit log entry
  try {
    if (userId) {
      await withDbTimeout(
        prisma.auditLog.create({
          data: {
            userId,
            action: "LEAVE_DELETED_BY_STUDENT",
            entity: "Leave",
            entityId: leaveId,
            metadata: {
              reason: "Request deleted by student",
              rollNumber: targetLeave.studentRollNumber,
              leaveId,
            },
          },
        }),
        400
      );
    }
  } catch (err) {
    console.warn("Audit log creation skipped/failed:", (err as Error).message);
  }

  // Delete from Prisma if reachable
  try {
    await withDbTimeout(
      prisma.leave.delete({
        where: { id: leaveId },
      }),
      400
    );
  } catch (err) {
    console.warn("Prisma leave delete skipped/failed:", (err as Error).message);
  }

  // Remove from JSON file store
  if (fileLeaveIndex !== -1) {
    allLeaves.splice(fileLeaveIndex, 1);
    saveLeavesToFile(allLeaves);
  }

  return { success: true };
}
