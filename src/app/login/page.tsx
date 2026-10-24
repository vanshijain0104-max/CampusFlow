/**
 * CampusFlow — Unified Multi-Role Authentication Screen
 * app/login/page.tsx
 *
 * Institutional White & Deep Navy Blue (#0A192F / #0F172A)
 * Features:
 * - Official Banasthali Vidyapith Logo (/banasthali-logo.png)
 * - Header: CampusFlow • Banasthali Vidyapith
 * - Minimal 5-Role Selection (Student active; Warden, Officer, HoD, Security disabled)
 * - Clean Student Login Form (Student Login, Roll Number, Password, Sign In)
 * - "Switch Role" button to return to role selection
 */

"use client";

import { useState, useTransition, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  GraduationCap,
  Home,
  FileText,
  Building,
  QrCode,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface FieldErrors {
  identifier?: string;
  password?: string;
}

function validate(identifier: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!identifier.trim()) {
    errors.identifier = "Roll Number is required.";
  }
  if (!password || !password.trim()) {
    errors.password = "Password is required.";
  }
  return errors;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [selectedRole, setSelectedRole] = useState<"STUDENT" | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const errors = validate(identifier, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    startTransition(async () => {
      const result = await signIn("credentials", {
        identifier: identifier.trim(),
        password: password.trim(),
        redirect: false,
      });

      if (result?.error) {
        setServerError("Invalid credentials. Please verify your Roll Number and Password.");
        return;
      }

      const destination = callbackUrl ?? "/student/dashboard";
      router.push(destination);
      router.refresh();
    });
  }

  function inputCls(hasError: boolean): string {
    return [
      "w-full rounded-xl border px-4 py-3 text-sm text-slate-900",
      "bg-slate-50 placeholder:text-slate-400",
      "focus:outline-none focus:ring-2 focus:border-transparent",
      "transition-colors duration-150",
      hasError
        ? "border-red-400 focus:ring-red-400"
        : "border-slate-300 focus:ring-[#0A192F]",
    ].join(" ");
  }

  const ROLES = [
    {
      id: "STUDENT" as const,
      title: "Student",
      icon: GraduationCap,
      isActive: true,
    },
    {
      id: "WARDEN" as const,
      title: "Hostel Warden",
      icon: Home,
      isActive: false,
    },
    {
      id: "OFFICER" as const,
      title: "Vani Mandir Leave Officer",
      icon: FileText,
      isActive: false,
    },
    {
      id: "HOD" as const,
      title: "Head of Department (HoD)",
      icon: Building,
      isActive: false,
    },
    {
      id: "GUARD" as const,
      title: "Security Guard",
      icon: QrCode,
      isActive: false,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-4 py-10">
      <div
        className={`w-full transition-all duration-300 ${
          selectedRole === "STUDENT" ? "max-w-md" : "max-w-2xl"
        }`}
      >
        <div className="shadow-2xl rounded-3xl overflow-hidden border border-slate-200 bg-white">
          {/* ── Top Banner: Clean two-line branding ── */}
          <header className="bg-[#0A192F] px-8 pt-8 pb-7 flex flex-col items-center text-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-3 flex items-center justify-center">
              <Image
                src="/banasthali-logo.png"
                alt="Banasthali Vidyapith Logo"
                width={96}
                height={96}
                className="w-full h-full object-contain drop-shadow-md"
                priority
              />
            </div>
            <h1 className="text-white text-3xl font-extrabold tracking-tight">
              CampusFlow
            </h1>
            <p className="text-blue-100 text-sm sm:text-base font-medium tracking-wide mt-1">
              Banasthali Vidyapith
            </p>
          </header>

          {/* ── Dynamic Content: Role Selection vs. Student Form ── */}
          {selectedRole === null ? (
            /* STEP 1: Minimal Role Selection */
            <section className="bg-white px-6 sm:px-10 py-8">
              <div className="text-center mb-6">
                <h2 className="text-[#0A192F] text-2xl font-bold tracking-tight">
                  Select Institutional Role
                </h2>
              </div>

              <div className="flex flex-col gap-3 max-w-lg mx-auto">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  if (role.isActive) {
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole("STUDENT")}
                        className="group text-left px-5 py-4 rounded-2xl border-2 border-[#0A192F] bg-white hover:bg-slate-50 shadow-sm hover:shadow-md transition-all duration-150 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-[#0A192F] text-white flex items-center justify-center shrink-0 shadow-sm">
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-base font-bold text-[#0A192F]">
                            {role.title}
                          </span>
                        </div>
                        <span className="text-[#0A192F] text-sm font-bold group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={role.id}
                      className="px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/70 opacity-50 flex items-center gap-4 cursor-not-allowed select-none"
                    >
                      <div className="w-11 h-11 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-base font-bold text-slate-700">
                        {role.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            /* STEP 2: Clean Student Login View */
            <section className="bg-white px-8 py-8 rounded-b-3xl animate-in fade-in duration-200">
              {/* Back to Role Selection Button */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(null);
                    setServerError(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A192F] hover:text-[#1E4080] hover:underline transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Switch Role
                </button>
              </div>

              {/* Title: Student Login */}
              <div className="mb-6">
                <h2 className="text-[#0A192F] text-2xl font-bold tracking-tight">
                  Student Login
                </h2>
              </div>

              {/* Server Error Alert */}
              {serverError && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                >
                  <AlertCircle
                    className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-red-700 text-xs font-medium leading-snug">{serverError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* ROLL NUMBER Field */}
                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    ROLL NUMBER
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                    }}
                    placeholder="Enter your Roll Number"
                    aria-invalid={!!fieldErrors.identifier}
                    className={inputCls(!!fieldErrors.identifier)}
                  />
                  {fieldErrors.identifier && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.identifier}
                    </p>
                  )}
                </div>

                {/* PASSWORD Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    PASSWORD
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      placeholder="Enter your password"
                      aria-invalid={!!fieldErrors.password}
                      className={`${inputCls(!!fieldErrors.password)} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p
                      role="alert"
                      className="mt-1.5 text-xs text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isPending}
                  className={[
                    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 mt-2",
                    "bg-[#0A192F] hover:bg-[#1E4080] active:bg-[#060E1A]",
                    "text-white font-bold text-xs uppercase tracking-wider",
                    "focus:outline-none focus:ring-2 focus:ring-[#1E4080] focus:ring-offset-2",
                    "transition-all duration-150 shadow-md cursor-pointer",
                    "disabled:opacity-70 disabled:cursor-not-allowed",
                  ].join(" ")}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign In</span>
                  )}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0A192F]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
