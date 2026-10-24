/**
 * CampusFlow — Unauthorized page
 * app/unauthorized/page.tsx
 *
 * Shown when an authenticated user tries to access a route
 * that requires a different role.
 */

import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-7 h-7 text-red-400" aria-hidden="true" />
        </div>
        <h1 className="text-[#0A192F] text-xl font-bold">Access Denied</h1>
        <p className="text-slate-500 text-sm mt-2 mb-6 leading-relaxed">
          You do not have permission to view this page.
          <br />
          If you believe this is an error, please contact your administrator.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-[#0A192F] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-[#0F2040] transition-colors"
        >
          Return to Login
        </Link>
      </div>
    </main>
  );
}
