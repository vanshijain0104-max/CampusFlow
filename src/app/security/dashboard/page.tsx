/**
 * CampusFlow — Security Guard Dashboard (Placeholder)
 * app/security/dashboard/page.tsx
 */

import Link from "next/link";
import { QrCode, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SecurityDashboard() {
  return (
    <div className="min-h-screen bg-[#F0F4F8]">
      <nav className="bg-[#0A192F] border-b border-[#1E4080] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode className="w-6 h-6 text-white" />
            <span className="text-white font-bold text-lg">CampusFlow · Campus Security Gate Checkpoint</span>
          </div>
          <Link href="/login" className="text-blue-200 hover:text-white text-sm flex items-center gap-1.5">
            <LogOut className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-xl mx-auto">
          <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold mb-3">
            Phase 2 Module
          </span>
          <h1 className="text-2xl font-bold text-[#0A192F] mb-2">Campus Security Gate Scanner</h1>
          <p className="text-slate-500 text-sm">
            High-speed optical QR code verification, biometric synchronization, and vehicle gate clearance.
          </p>
          <div className="mt-6 pt-6 border-t border-slate-100">
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-[#0A192F] text-white text-xs font-bold rounded-xl hover:bg-[#1E4080] transition"
            >
              Return to Role Selection
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
