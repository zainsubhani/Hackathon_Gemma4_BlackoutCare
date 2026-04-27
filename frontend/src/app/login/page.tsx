"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();

  const [staffCode, setStaffCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staff_code: staffCode,
          password,
        }),
      });

      if (!res.ok) {
        throw new Error("Invalid staff code or password");
      }

      const data = await res.json();

      localStorage.setItem("access_token", data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError("Invalid staff code or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* Left side */}
        <section>
          <div className="inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 border border-blue-100">
            Downtime Mode Ready
          </div>

          <h1 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            CareContinuum
          </h1>

          <p className="mt-4 text-xl text-slate-600 leading-relaxed">
            Offline clinical workflow continuity for hospitals during
            cyberattacks, outages, and emergency downtime.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Mode</p>
              <p className="mt-1 font-semibold text-slate-900">Offline-first</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">AI</p>
              <p className="mt-1 font-semibold text-slate-900">Local Gemma</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">Safety</p>
              <p className="mt-1 font-semibold text-slate-900">Audit-ready</p>
            </div>
          </div>
        </section>

        {/* Login card */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Clinical Staff Login
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Authorized hospital personnel only.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Staff Code
              </label>
              <input
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
                placeholder="DOC-900"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-500 leading-relaxed">
            CareContinuum is a decision-support prototype. It does not replace
            clinical judgment, licensed professionals, or hospital policy.
          </p>
        </section>
      </div>
    </main>
  );
}