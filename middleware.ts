/**
 * CampusFlow — RBAC Middleware
 * middleware.ts  (root level — processed by Next.js Edge Runtime)
 *
 * Route protection map:
 *   /student/*  → STUDENT only
 *   /warden/*   → WARDEN only
 *   /guard/*    → GUARD only
 *   /admin/*    → ADMIN only
 *
 * Behaviors:
 *   • Unauthenticated → redirect to /login?callbackUrl=<original>
 *   • Wrong role       → redirect to /unauthorized
 *   • Authenticated hitting /login → redirect to role dashboard
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Maps
// ─────────────────────────────────────────────────────────────────────────────

/** Path prefix → required role */
const ROLE_FOR_ROUTE: Record<string, string> = {
  "/student": "STUDENT",
  "/warden": "WARDEN",
  "/guard": "GUARD",
  "/admin": "ADMIN",
};

/** Role → home dashboard */
export const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student/dashboard",
  WARDEN: "/warden/dashboard",
  GUARD: "/guard/dashboard",
  ADMIN: "/admin/dashboard",
};

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userRole: string = session?.user?.role ?? "";

  // ── Already authenticated → bounce away from /login ──────────────────────
  if (pathname === "/login" && userRole) {
    const destination = ROLE_HOME[userRole] ?? "/";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  // ── Check whether this path requires a specific role ─────────────────────
  const matchedPrefix = Object.keys(ROLE_FOR_ROUTE).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!matchedPrefix) {
    return NextResponse.next();
  }

  const requiredRole = ROLE_FOR_ROUTE[matchedPrefix];

  // ── Not authenticated ─────────────────────────────────────────────────────
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Wrong role ────────────────────────────────────────────────────────────
  if (userRole !== requiredRole) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Matcher — only run middleware on relevant paths
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/student/:path*",
    "/warden/:path*",
    "/guard/:path*",
    "/admin/:path*",
    "/login",
  ],
};
