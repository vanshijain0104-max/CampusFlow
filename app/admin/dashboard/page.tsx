/**
 * CampusFlow — Admin Dashboard (Placeholder)
 * app/admin/dashboard/page.tsx
 * Phase 1 stub. Full admin panel: future phases.
 */

import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <nav className="bg-[#0A192F] border-b border-[#1E4080] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-white" />
            <span className="text-white font-bold text-lg">CampusFlow · Admin Portal</span>
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button type="submit" className="text-blue-200 hover:text-white text-sm flex items-center gap-1.5">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-[#0A192F] mb-2">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm">Logged in as: {session.user.email}</p>
          <p className="text-slate-400 text-xs mt-4">
            System configuration, user management & reports coming in future phases.
          </p>
        </div>
      </main>
    </div>
  );
}
