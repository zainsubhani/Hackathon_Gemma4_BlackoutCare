"use client";

import { AlertTriangle, Clock, RefreshCcw, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { apiFetch, formatDateTime, titleCase, type SafetyBoard, type SafetyCase } from "@/lib/api";

export default function SafetyPage() {
  const [board, setBoard] = useState<SafetyBoard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiFetch<SafetyBoard>("/operations/safety-board")
      .then((data) => active && setBoard(data))
      .catch((err) => active && setError(err instanceof Error ? err.message : "Unable to load safety board"));
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardShell active="safety">
      <div className="mx-auto max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Patient Safety Board</h1>
          <p className="mt-2 text-base text-slate-500 sm:text-lg">
            Live operational risks during downtime
          </p>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        {board && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Open Cases" value={board.summary.open_cases} />
              <Metric label="Critical" value={board.summary.critical_cases} tone="red" />
              <Metric label="Unknown Allergies" value={board.summary.unknown_allergies} tone="amber" />
              <Metric label="Stale Notes" value={board.summary.stale_note_cases} tone="amber" />
              <Metric label="AI Pending" value={board.summary.pending_ai_reviews} />
              <Metric label="Recovery Pending" value={board.summary.recovery_pending} />
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-2">
              <RiskPanel title="Critical Cases" icon={AlertTriangle} cases={board.critical_cases} tone="red" />
              <RiskPanel title="Unknown Allergies" icon={ShieldAlert} cases={board.unknown_allergies} tone="amber" />
              <RiskPanel title="No Recent Note" icon={Clock} cases={board.stale_note_cases} tone="amber" />
              <RiskPanel title="Unassigned Urgency" icon={RefreshCcw} cases={board.unassigned_cases} />
            </section>

            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-black">Pending AI Reviews</h2>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {board.pending_ai_reviews.map((item) => (
                  <article key={item.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">Recommendation {item.id}</p>
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">Case {item.case_id}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{titleCase(item.confidence)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.risk_summary}</p>
                  </article>
                ))}
                {board.pending_ai_reviews.length === 0 && <p className="py-6 text-sm text-slate-500">No pending AI reviews.</p>}
              </div>
            </section>
          </>
        )}

        {!board && !error && <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading safety board...</div>}
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "red" | "amber" }) {
  const toneClass = tone === "red" ? "border-red-100 bg-red-50" : tone === "amber" ? "border-amber-100 bg-amber-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-2xl border p-5 text-center shadow-sm ${toneClass}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-2 text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}

function RiskPanel({
  title,
  icon: Icon,
  cases,
  tone = "slate",
}: {
  title: string;
  icon: React.ElementType;
  cases: SafetyCase[];
  tone?: "slate" | "red" | "amber";
}) {
  const iconTone = tone === "red" ? "text-red-600 bg-red-50" : tone === "amber" ? "text-amber-600 bg-amber-50" : "text-teal-600 bg-teal-50";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconTone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-black">{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{cases.length}</span>
      </div>
      <div className="mt-5 divide-y divide-slate-100">
        {cases.map((item) => (
          <article key={item.id} className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">{item.patient_name || item.patient_label}</p>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">Case {item.id}</span>
              <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{titleCase(item.status)}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.chief_complaint}</p>
            <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
          </article>
        ))}
        {cases.length === 0 && <p className="py-6 text-sm text-slate-500">No matching cases.</p>}
      </div>
    </section>
  );
}
