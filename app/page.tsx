/**
 * CampusFlow — Root redirect page
 * app/page.tsx
 *
 * Redirects authenticated users to their role dashboard,
 * otherwise bounces to /login.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student/dashboard",
  WARDEN: "/warden/dashboard",
  GUARD: "/guard/dashboard",
  ADMIN: "/admin/dashboard",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  if (session?.user?.role) {
    redirect(ROLE_HOME[session.user.role] ?? "/login");
  }
  redirect("/login");
}
