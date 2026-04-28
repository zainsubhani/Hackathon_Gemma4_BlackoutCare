"use client";

import { BookOpen, Brain, ChevronDown, Download, FileText, Filter, Stethoscope } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { apiFetch, formatDateTime, titleCase, type AuditEvent } from "@/lib/api";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [eventType, setEventType] = useState("");
  const [caseId, setCaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents(nextEventType = eventType, nextCaseId = caseId) {
    setLoading(true);
    setError("");
    try {
      if (nextCaseId.trim()) {
        setEvents(await apiFetch<AuditEvent[]>(`/events/case/${encodeURIComponent(nextCaseId.trim())}?limit=500`));
      } else {
        const params = new URLSearchParams({ limit: "500" });
        if (nextEventType) params.set("event_type", nextEventType);
        setEvents(await apiFetch<AuditEvent[]>(`/events/?${params}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load audit events");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialEvents() {
      try {
        const data = await apiFetch<AuditEvent[]>("/events/?limit=500");
        if (active) setEvents(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load audit events");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialEvents();
    return () => {
      active = false;
    };
  }, []);

  const eventTypes = Array.from(new Set(events.map((event) => event.event_type))).sort();

  return (
    <DashboardShell active="audit">
      <div className="mx-auto max-w-[90rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Audit Log</h1>
          <p className="mt-2 text-base text-slate-500 sm:text-lg">
            Complete audit trail of all system events
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-5 w-5 text-slate-500" />
            <FilterSelect label="All Event Types" value={eventType} onChange={(value) => { setEventType(value); loadEvents(value, ""); }} options={eventTypes} />
            <input
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
              onBlur={() => loadEvents(eventType, caseId)}
              placeholder="Case ID"
              className="h-11 w-32 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
            />
          </div>
          <p className="text-sm font-medium text-slate-500 sm:text-base">{events.length} events</p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {events.map((event) => (
              <AuditRow key={event.id} event={event} />
            ))}
            {!loading && events.length === 0 && (
              <div className="p-10 text-center text-slate-500">No audit events found.</div>
            )}
            {loading && <div className="p-10 text-center text-slate-500">Loading audit events...</div>}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="relative">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-44 appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none hover:bg-slate-50 sm:text-base">
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-slate-500" />
    </label>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  const Icon = event.event_type.includes("TRIAGE")
    ? Stethoscope
    : event.event_type.includes("PROTOCOL")
      ? BookOpen
      : event.event_type.includes("REPORT")
        ? Download
        : event.event_type.includes("AI")
          ? Brain
          : FileText;
  const actionTone = event.event_type.includes("REPORT") ? "bg-amber-50 text-amber-700" : event.event_type.includes("PROTOCOL") || event.event_type.includes("AI") ? "bg-emerald-50 text-emerald-700" : event.event_type.includes("TRIAGE") ? "bg-blue-50 text-blue-700" : "bg-teal-50 text-teal-700";
  const isCritical = event.event_type.includes("FAILED") || event.event_type.includes("CRITICAL");

  return (
    <article className="grid gap-4 px-4 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-6 sm:text-lg">{titleCase(event.event_type)}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`rounded-md px-2 py-1 text-xs font-black ${actionTone}`}>
            {titleCase(event.event_type)}
          </span>
          <span className={`rounded-md px-2 py-1 text-xs font-bold ${isCritical ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
            {isCritical ? "critical" : "info"}
          </span>
          {event.case_id && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
              Case {event.case_id}
            </span>
          )}
        </div>
      </div>

      <div className="text-left text-sm text-slate-500 sm:text-right">
        <p>{formatDateTime(event.created_at)}</p>
        {event.actor_id && <p className="mt-2 text-slate-400">User {event.actor_id}</p>}
      </div>
    </article>
  );
}
