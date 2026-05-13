"use client";

import { useRouter } from "next/navigation";
import { Activity, Brain, Eye, EyeOff, FileText, KeyRound, Lock, ShieldCheck, Siren, UserRound, WifiOff, X } from "lucide-react";
import { useState } from "react";
import { setToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();
  const [staffCode, setStaffCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetStaffCode, setResetStaffCode] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ staff_code: staffCode, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error("Login failed");
      setToken(data.access_token);

      router.push("/dashboard");
    } catch {
      setError("Invalid staff code or password");
    } finally {
      setLoading(false);
    }
  }

  function openForgotPassword() {
    setResetStaffCode(staffCode);
    setMasterPassword("");
    setNewPassword("");
    setResetError("");
    setResetSuccess("");
    setForgotOpen(true);
  }

  async function handleForgotPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    setResetLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_code: resetStaffCode,
          master_password: masterPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Password reset failed");

      setStaffCode(data.staff_code);
      setPassword(newPassword);
      setResetSuccess(data.message || "Password reset successfully. Use the new password to sign in.");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setResetLoading(false);
    }
  }

  function closeResetAfterSuccess() {
    setMasterPassword("");
    setNewPassword("");
    setForgotOpen(false);
  }

  return (
    <main className="min-h-svh overflow-hidden bg-[#F8FAFC] text-slate-900">
      <div className="mx-auto grid min-h-svh w-full max-w-7xl grid-cols-1 gap-10 px-4 py-8 sm:px-6 sm:py-10 md:gap-14 lg:grid-cols-[minmax(0,40rem)_minmax(23rem,28rem)] lg:items-center lg:justify-center lg:gap-16 lg:py-10 xl:max-w-344 xl:gap-28 2xl:max-w-384 2xl:gap-44 min-[1900px]:max-w-416 min-[1900px]:gap-64">
        <section className="relative">
          <div className="absolute left-1/2 top-8 hidden h-72 w-72 rounded-full bg-blue-100/70 blur-3xl lg:block" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 sm:h-14 sm:w-14">
                <Activity className="h-7 w-7 sm:h-7.5 sm:w-7.5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
                  Blackout<span className="text-blue-600">Care</span>
                </h1>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-xs sm:tracking-[0.25em]">
                  Continue care. Anytime. Anywhere.
                </p>
              </div>
            </div>

            <div className="mt-8 max-w-2xl sm:mt-10 lg:mt-12">
              <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl xl:text-5xl">
                Clinical workflows that{" "}
                <span className="text-blue-600">continue when systems fail.</span>
              </h2>

              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
                Offline-first clinical operations during cyberattacks, IT outages,
                and hospital downtime — powered by local Gemma AI and protocol-based
                guidance.
              </p>
            </div>

            <div className="mt-6 h-px max-w-xl bg-slate-200 sm:mt-8" />

            <div className="mt-6 grid max-w-xl gap-4 sm:mt-8 sm:gap-5">
              <Feature
                icon={<WifiOff size={24} />}
                title="Offline-First"
                text="Works without internet or EHR access."
                color="blue"
              />
              <Feature
                icon={<Brain size={24} />}
                title="AI-Powered Guidance"
                text="Local Gemma AI for protocol-based recommendations."
                color="emerald"
              />
              <Feature
                icon={<FileText size={24} />}
                title="Audit & Recovery"
                text="Complete event logs and exportable PDF/JSON reports."
                color="amber"
              />
            </div>

            <div className="mt-6 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4 sm:mt-8 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 sm:h-12 sm:w-12">
                  <Siren />
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-red-700">
                    Downtime Mode <span className="rounded-full bg-red-500 px-2 py-1 text-xs text-white">ACTIVE</span>
                  </p>
                  <p className="mt-1 text-sm text-red-700">
                    Hospital operating in offline clinical continuity mode.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid max-w-3xl grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3 lg:mt-10 lg:gap-5 lg:pt-8">
              <Mini icon={<ShieldCheck />} title="Secure & Private" text="Data stays local" />
              <Mini icon={<Lock />} title="Role-Based Access" text="Authorized staff only" />
              <Mini icon={<FileText />} title="Export Ready" text="PDF & JSON reports" />
            </div>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/80 sm:p-7 lg:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:h-20 sm:w-20 lg:h-24 lg:w-24">
            <UserRound className="h-9 w-9 sm:h-10 sm:w-10 lg:h-10.5 lg:w-10.5" />
          </div>

          <div className="mt-5 text-center sm:mt-7 lg:mt-8">
            <h2 className="text-2xl font-black sm:text-3xl">Welcome Back</h2>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">Sign in to continue clinical operations</p>
          </div>

          <form onSubmit={handleLogin} className="mt-7 space-y-5 sm:mt-9 sm:space-y-6 lg:mt-10">
            <div>
              <label className="text-sm font-bold text-slate-800">Staff Code</label>
              <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                <input
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
                  placeholder="Enter your staff code"
                  className="h-12 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-slate-400 sm:h-14"
                />
                <UserRound className="text-slate-400" size={22} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800">Password</label>
                <button type="button" onClick={openForgotPassword} className="text-sm font-semibold text-blue-600">
                  Forgot password?
                </button>
              </div>
              <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="h-12 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-slate-400 sm:h-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60 sm:h-14"
            >
              <Lock size={18} />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 flex gap-3 rounded-2xl bg-slate-50 p-4 sm:mt-8 sm:gap-4 sm:p-5">
            <ShieldCheck className="mt-1 shrink-0 text-slate-500" />
            <div className="min-w-0">
              <p className="font-bold">Authorized Clinical Staff Only</p>
              <p className="mt-1 text-sm text-slate-500">
                All activities are logged and monitored for patient safety.
              </p>
            </div>
          </div>
        </section>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/20 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black">Reset Password</h2>
                  <p className="mt-1 text-sm text-slate-500">Use the administrator master password to set a new password.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Close password reset"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-800">Staff Code</label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    value={resetStaffCode}
                    onChange={(e) => setResetStaffCode(e.target.value.toUpperCase())}
                    placeholder="Enter your staff code"
                    className="h-12 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-slate-400"
                  />
                  <UserRound className="text-slate-400" size={22} />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-800">Administrator Master Password</label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    type={showMasterPassword ? "text" : "password"}
                    placeholder="Enter master password"
                    className="h-12 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPassword((value) => !value)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showMasterPassword ? "Hide master password" : "Show master password"}
                    aria-pressed={showMasterPassword}
                  >
                    {showMasterPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-800">New Password</label>
                <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Set new password"
                    className="h-12 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((value) => !value)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    aria-pressed={showNewPassword}
                  >
                    {showNewPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>

              {resetError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-bold text-emerald-800">Password reset</p>
                  <p className="mt-1 text-sm text-emerald-700">{resetSuccess}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  <KeyRound size={18} />
                  {resetLoading ? "Resetting..." : "Reset Password"}
                </button>
                {resetSuccess && (
                  <button
                    type="button"
                    onClick={closeResetAfterSuccess}
                    className="h-12 flex-1 rounded-xl border border-slate-300 font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to Login
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  color: "blue" | "emerald" | "amber";
}) {
  const bg = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${bg[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function Mini({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 text-slate-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{text}</p>
      </div>
    </div>
  );
}
