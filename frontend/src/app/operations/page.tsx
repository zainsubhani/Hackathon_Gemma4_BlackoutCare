"use client";

import { AlertTriangle, Brain, CheckCircle2, ClipboardList, RadioTower, RefreshCcw } from "lucide-react";
import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  apiFetch,
  formatDateTime,
  titleCase,
  type AIOversightReport,
  type HandoffReport,
  type ReadinessReport,
  type RecoveryConflictReport,
  type TimelineEvent,
} from "@/lib/api";

export default function OperationsPage() {
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [handoff, setHandoff] = useState<HandoffReport | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [conflicts, setConflicts] = useState<RecoveryConflictReport | null>(null);
  const [oversight, setOversight] = useState<AIOversightReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOperations() {
      try {
        const [readinessData, handoffData, timelineData, conflictData, oversightData] = await Promise.all([
          apiFetch<ReadinessReport>("/operations/readiness"),
          apiFetch<HandoffReport>("/operations/handoff"),
          apiFetch<TimelineEvent[]>("/operations/timeline"),
          apiFetch<RecoveryConflictReport>("/operations/recovery-conflicts"),
          apiFetch<AIOversightReport>("/operations/ai-oversight"),
        ]);
        if (active) {
          setReadiness(readinessData);
          setHandoff(handoffData);
          setTimeline(timelineData);
          setConflicts(conflictData);
          setOversight(oversightData);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load operations cockpit");
      }
    }

    loadOperations();
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardShell active="operations">
      <div className="mx-auto max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Operations Cockpit</h1>
          <p className="mt-2 text-base text-slate-500 sm:text-lg">Shift handoff, readiness, recovery risk, and AI oversight</p>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Open Cases" value={readiness?.open_cases ?? 0} icon={RadioTower} />
          <Metric label="Pending AI Reviews" value={readiness?.pending_ai_reviews ?? 0} icon={Brain} />
          <Metric label="Critical Handoff" value={handoff?.summary.critical ?? 0} icon={AlertTriangle} tone="red" />
          <Metric label="Recovery Conflicts" value={conflicts?.total ?? 0} icon={RefreshCcw} tone="amber" />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Offline Readiness">
            <div className="grid gap-3">
              {readiness?.checks.map((check) => (
                <div key={check.key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-black text-slate-800">{check.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{check.detail}</p>
                  </div>
                  <Status status={check.status} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Shift Handoff">
            <div className="grid gap-3">
              {handoff?.cases.slice(0, 8).map((item) => (
                <Link key={item.id} href="/triage" className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-200 hover:bg-teal-50/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black">{item.patient_name || item.patient_label}</p>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">{titleCase(item.urgency_level)} - {titleCase(item.status)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.chief_complaint}</p>
                  <div className="mt-3 grid gap-2 text-xs font-medium text-slate-500 sm:grid-cols-3">
                    <span>{item.last_vitals ? `${titleCase(item.last_vitals.trend)}: ${item.last_vitals.summary}` : "No vitals yet"}</span>
                    <span>{item.open_protocol_actions} open actions</span>
                    <span>{item.last_note_at ? `Note ${formatDateTime(item.last_note_at)}` : "No notes yet"}</span>
                  </div>
                </Link>
              ))}
              {handoff?.cases.length === 0 && <p className="text-sm text-slate-500">No active cases to hand off.</p>}
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <Panel title="Incident Timeline">
            <div className="grid gap-3">
              {timeline.slice(0, 12).map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-800">{event.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(event.created_at)} {event.case_id ? `- Case ${event.case_id}` : ""}</p>
                </div>
              ))}
              {timeline.length === 0 && <p className="text-sm text-slate-500">No incident events yet.</p>}
            </div>
          </Panel>

          <Panel title="Recovery Review">
            <div className="grid gap-3">
              {conflicts?.items.slice(0, 12).map((item, index) => (
                <Link key={`${item.type}-${item.label}-${index}`} href={item.href} className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-200 hover:bg-teal-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-800">{item.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                    </div>
                    <Severity value={item.severity} />
                  </div>
                </Link>
              ))}
              {conflicts?.items.length === 0 && <p className="text-sm text-slate-500">No recovery conflicts detected.</p>}
            </div>
          </Panel>

          <Panel title="AI Oversight">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(oversight?.summary || {}).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-500">{titleCase(key)}</p>
                    <p className="mt-2 text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>
              {oversight?.recent.slice(0, 5).map((item) => (
                <Link key={item.id} href="/triage" className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-teal-200 hover:bg-teal-50/40">
                  <p className="text-sm font-black">Case {item.case_id} - {titleCase(item.review_status)}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.risk_summary}</p>
                </Link>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value, icon: Icon, tone = "slate" }: { label: string; value: number; icon: ElementType; tone?: "slate" | "red" | "amber" }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-600",
    red: "border-red-100 bg-red-50 text-red-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.08em]">{label}</p>
          <p className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <Icon className="h-8 w-8" />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <ClipboardList className="h-5 w-5 text-teal-600" />
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Status({ status }: { status: string }) {
  const ok = status === "ok";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {titleCase(status)}
    </span>
  );
}

function Severity({ value }: { value: string }) {
  const critical = value === "critical";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${critical ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{titleCase(value)}</span>;
}
