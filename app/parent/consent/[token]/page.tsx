import React from "react";
import { getLeaveByToken } from "@/lib/db/leaves-store";
import ParentConsentView from "@/components/parent/ParentConsentView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ParentConsentPage({ params }: PageProps) {
  const resolvedParams = await params;
  const token = resolvedParams?.token || "";

  const { leave, student, isExpired, isActioned } = await getLeaveByToken(token);

  if (!leave || !student || isExpired || isActioned || !leave.parentToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-[#0A192F]">This link is no longer valid.</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-lg w-full">
        <ParentConsentView token={token} leave={leave} student={student} />
      </div>
    </div>
  );
}
