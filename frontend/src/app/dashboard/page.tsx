"use client";

import { Activity, BookOpen, Download, FileText, Stethoscope, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import {
  apiFetch,
  formatDateTime,
  titleCase,
  type AuditEvent,
  type Patient,
  type Protocol,
  type TriageCase,
} from "@/lib/api";

type Summary = {
  patients: number;
  triage_cases: number;
  active_cases: number;
  critical_active_cases: number;
  protocols: number;
  events: number;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const [summaryData, patientData, caseData, eventData] = await Promise.all([
          apiFetch<Summary>("/dashboard/summary"),
          apiFetch<Patient[]>("/patients/?limit=500"),
          apiFetch<TriageCase[]>("/triage/cases/?limit=5"),
          apiFetch<AuditEvent[]>("/events/?limit=6"),
          apiFetch<Protocol[]>("/protocols/?limit=1"),
        ]);
        if (active) {
          setSummary(summaryData);
          setPatients(patientData);
          setCases(caseData);
          setAuditEvents(eventData);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load dashboard data");
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const metrics = [
    { label: "Patients", value: summary?.patients ?? 0, detail: "registered", icon: UsersRound, tone: "white" as const },
    { label: "Active Cases", value: summary?.active_cases ?? 0, detail: `${summary?.triage_cases ?? 0} total`, icon: Stethoscope, tone: "blue" as const },
    { label: "Critical", value: summary?.critical_active_cases ?? 0, detail: "need attention", icon: Activity, tone: "red" as const },
    { label: "Protocols", value: summary?.protocols ?? 0, detail: "available", icon: BookOpen, tone: "green" as const },
  ];

  return (
    <DashboardShell active="dashboard">
      <div className="mx-auto max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Command Center</h1>
          <p className="mt-2 text-base text-slate-500 sm:text-lg">
            Hospital downtime operations overview
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2 xl:items-start">
          <Panel title="Recent Triage Cases">
            <div className="grid gap-6">
              {cases.map((item) => (
                <CaseRow key={item.id} item={item} patient={patientsById.get(item.patient_id)} />
              ))}
              {cases.length === 0 && <p className="text-slate-500">No triage cases yet.</p>}
            </div>
          </Panel>

          <Panel title="Audit Trail">
            <div className="grid gap-7">
              {auditEvents.map((event) => (
                <AuditRow key={event.id} event={event} />
              ))}
              {auditEvents.length === 0 && <p className="text-slate-500">No audit events yet.</p>}
            </div>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ElementType;
  tone: "white" | "blue" | "red" | "green";
}) {
  const tones = {
    white: "border-slate-200 bg-white",
    blue: "border-teal-100 bg-teal-50/60",
    red: "border-red-100 bg-red-50/70",
    green: "border-emerald-100 bg-emerald-50/80",
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.11em] text-slate-500">{label}</p>
          <p className="mt-4 text-4xl font-black tracking-tight">{value}</p>
          <p className="mt-3 text-sm font-semibold text-slate-500">-&gt; {detail}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:min-h-[34rem]">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CaseRow({ item, patient }: { item: TriageCase; patient?: Patient }) {
  const tone = item.urgency_level === "critical" ? "red" : item.urgency_level === "urgent" ? "orange" : item.urgency_level === "stable" ? "green" : "amber";
  const dots = { red: "bg-red-500", orange: "bg-orange-500", green: "bg-emerald-500", amber: "bg-amber-400" };
  const badges = {
    red: "bg-red-50 text-red-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="flex min-w-0 gap-4">
        <span className={`mt-2 h-3 w-3 shrink-0 rounded-full ${dots[tone]}`} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold leading-tight">{patient?.full_name || patient?.patient_code || `Patient ${item.patient_id}`}</p>
            <span className={`rounded-md px-2 py-1 text-xs font-black ${badges[tone]}`}>
              {titleCase(item.urgency_level)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">{item.chief_complaint}</p>
        </div>
      </div>
      <div className="ml-7 flex items-center gap-3 sm:ml-0 sm:block sm:text-right">
        <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{titleCase(item.status)}</span>
        <p className="mt-0 text-sm text-slate-500 sm:mt-3">{formatDateTime(item.created_at)}</p>
      </div>
    </div>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  const Icon = event.event_type.includes("TRIAGE") ? Stethoscope : event.event_type.includes("REPORT") ? Download : FileText;
  const isCritical = event.event_type.includes("FAILED") || event.event_type.includes("CRITICAL");

  return (
    <div className="flex gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold leading-6 sm:text-lg">{titleCase(event.event_type)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
          <span className={`h-2 w-2 rounded-full ${isCritical ? "bg-red-400" : "bg-blue-400"}`} />
          <span>{formatDateTime(event.created_at)}{event.actor_id ? ` by User ${event.actor_id}` : ""}</span>
        </div>
      </div>
    </div>
  );
}
