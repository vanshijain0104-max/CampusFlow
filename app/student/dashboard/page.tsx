/**
 * CampusFlow — Student Dashboard
 * app/student/dashboard/page.tsx
 *
 * Clean Institutional Student Dashboard:
 * - Student Profile Header & Welcome
 * - Semester Quota Meter EXCLUSIVELY for Casual Leave (15 Days Allowance)
 * - Scheduled Institutional Vacations (Fixed breaks: Diwali & Summer, without quota meters)
 * - Real Recent Leave Applications & Status Badges
 * - "Apply for Leave" prominent CTA linking to /student/apply
 * - Instant navigation with prefetch={false} to eliminate compilation stalls
 */

import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma, withDbTimeout } from "@/lib/prisma";
import Link from "next/link";
import {
  GraduationCap,
  LogOut,
  Calendar,
  Clock,
  Sun,
  PlusCircle,
  FileText,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { getStudentLeaves, findStudentByIdentifier } from "@/lib/db/leaves-store";
import StudentLeavesTable from "@/components/student/StudentLeavesTable";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const session = await auth();

  if (!session?.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  // Fetch student profile with hostel and leave quotas
  let dbStudent: any = null;
  try {
    dbStudent = await withDbTimeout(
      prisma.student.findFirst({
        where: {
          OR: [
            { rollNumber: session.user.rollNumber ?? "" },
            { studentId: session.user.studentId ?? "" },
          ],
        },
        include: {
          hostel: true,
          leaveQuota: {
            where: { session: "2026-27" },
            orderBy: { leaveType: "asc" },
          },
        },
      }),
      400
    );
  } catch (err) {
    console.warn("DB query failed on dashboard, falling back to local store:", err);
  }

  const fallbackStudent = findStudentByIdentifier(session.user.rollNumber || session.user.studentId || "241H0320145");

  const student = dbStudent || {
    id: fallbackStudent?.id || "std_fallback",
    fullName: fallbackStudent?.fullName || session.user.name || "Student",
    rollNumber: fallbackStudent?.rollNumber || session.user.rollNumber || "241H0320145",
    studentId: fallbackStudent?.studentId || session.user.studentId || "BTBTC24145",
    branch: fallbackStudent?.branch || "CSE",
    programme: fallbackStudent?.programme || "B.Tech",
    year: fallbackStudent?.year || 1,
    hostel: { name: fallbackStudent?.hostelName || "Shri Shanta Soudh" },
    leaveQuota: [
      { leaveType: "CASUAL", totalDays: 15, usedDays: 0 },
    ],
    leaves: [],
  };

  // Fetch real applications from the store / DB (no placeholder rows)
  const applications = await getStudentLeaves(student.rollNumber || student.studentId);
  const displayLeaves = applications || [];

  const quotaMap = Object.fromEntries(
    student?.leaveQuota?.map((q: any) => [q.leaveType, q]) ?? []
  );

  const casualTotal = quotaMap["CASUAL"]?.totalDays ?? 15;
  const casualUsed = quotaMap["CASUAL"]?.usedDays ?? 0;
  const casualRemaining = Math.max(0, casualTotal - casualUsed);
  const casualPct = casualTotal > 0 ? Math.min(100, Math.round((casualUsed / casualTotal) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      {/* ── Navigation bar ── */}
      <nav className="bg-[#0A192F] border-b border-[#1E4080] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-7 h-7 text-white" aria-hidden="true" />
            <div>
              <span className="text-white font-bold text-lg tracking-wide">CampusFlow</span>
              <span className="text-blue-300 text-xs tracking-widest uppercase ml-2 hidden sm:inline">
                Student Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/student/apply"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Apply for Leave</span>
            </a>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Welcome Card with Profile Header & Prominent CTA ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  Active Student
                </span>
                <span className="text-xs text-slate-400">Academic Session 2026–27</span>
              </div>
              <h1 className="text-[#0A192F] text-2xl font-bold">
                Welcome back, {student?.fullName ?? "Student"} 👋
              </h1>
              <p className="text-slate-500 text-sm">
                {student?.branch} · {student?.programme} (Year {student?.year}) · {student?.hostel?.name || "Banasthali Hostel"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-[#0A192F]/5 border border-[#0A192F]/10 rounded-xl px-4 py-2.5 text-xs space-y-0.5">
                <div className="flex gap-2">
                  <span className="text-slate-400 w-16">Roll No:</span>
                  <strong className="text-[#0A192F]">{student?.rollNumber}</strong>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-16">Student ID:</span>
                  <strong className="text-[#0A192F]">{student?.studentId}</strong>
                </div>
              </div>

              <a
                href="/student/apply"
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0A192F] hover:bg-[#1E4080] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all focus:ring-2 focus:ring-[#1E4080] focus:ring-offset-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-blue-300" />
                <span>Apply for Leave</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-300" />
              </a>
            </div>
          </div>
        </div>

        {/* ── Semester Quota Meter (EXCLUSIVELY Casual Leave) ── */}
        <section aria-labelledby="casual-quota-meter">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-[#1E4080]" />
                <h2 id="casual-quota-meter" className="text-base font-bold text-[#0A192F]">
                  Casual Leave Balance
                </h2>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#0A192F]">
                <span>Casual Leave Balance: {casualUsed} of 15 Days Used ({casualRemaining} Days Remaining)</span>
              </div>
            </div>

            {/* Clean Visual Progress Gauge */}
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  casualPct > 100
                    ? "bg-amber-500"
                    : casualPct > 75
                    ? "bg-blue-600"
                    : "bg-[#0A192F]"
                }`}
                style={{ width: `${Math.min(100, casualPct)}%` }}
                role="progressbar"
                aria-valuenow={casualPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Casual Leave Balance: ${casualUsed} of 15 Days Used (${casualRemaining} Days Remaining)`}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-2.5 font-medium">
              <span>0 Days (Min)</span>
              <span className="font-semibold text-slate-700">{casualRemaining} Days Remaining</span>
              <span>15 Days Allowance</span>
            </div>
          </div>
        </section>

        {/* ── Fixed Scheduled Institutional Vacations (NO quota counters or progress bars) ── */}
        <section aria-labelledby="institutional-breaks">
          <h2
            id="institutional-breaks"
            className="text-[#0A192F] font-semibold text-xs uppercase tracking-widest mb-3"
          >
            Scheduled Institutional Vacations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Diwali Recess */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0A192F]">Diwali Recess</h3>
                <p className="text-xs text-slate-500 mt-0.5">Scheduled Institutional Vacation</p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-violet-600" />
                  <span>03 Nov 2026 – 17 Nov 2026</span>
                </div>
              </div>
            </div>

            {/* Summer Vacation */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0A192F]">Summer Vacation</h3>
                <p className="text-xs text-slate-500 mt-0.5">1st May to 10th July (Scheduled Institutional Break)</p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>01 May 2027 – 10 Jul 2027 (2 months & 10 days)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Real Recent Leave Applications (No Mock Rows) ── */}
        <section aria-labelledby="history-heading">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="history-heading" className="text-sm font-bold text-[#0A192F] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1E4080]" />
                Recent Leave Applications
              </h2>
              <Link
                href="/student/apply"
                prefetch={false}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 transition flex items-center gap-1"
              >
                <span>New Application</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <StudentLeavesTable initialLeaves={displayLeaves} />
          </div>
        </section>
      </main>
    </div>
  );
}
