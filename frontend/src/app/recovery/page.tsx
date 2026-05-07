"use client";

import { Download, RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { API_URL, apiFetch, titleCase, type Incident, type RecoveryItem, type RecoveryPreview } from "@/lib/api";

const statuses = ["reviewed", "synced", "failed", "manual_entry_required"] as const;

export default function RecoveryPage() {
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [preview, setPreview] = useState<RecoveryPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  const grouped = useMemo(() => {
    const groups: Record<string, RecoveryItem[]> = {};
    for (const item of preview?.items || []) {
      groups[item.item_type] ||= [];
      groups[item.item_type].push(item);
    }
    return groups;
  }, [preview]);

  async function loadRecovery() {
    setLoading(true);
    setError("");
    try {
      const incident = await apiFetch<Incident | null>("/incidents/active");
      setActiveIncident(incident);
      if (incident) {
        setPreview(await apiFetch<RecoveryPreview>(`/recovery/incidents/${incident.id}/sync-preview`));
      } else {
        setPreview(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load recovery sync center");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecovery();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function updateStatus(item: RecoveryItem, syncStatus: string) {
    setUpdating(`${item.item_type}-${item.item_id}`);
    setError("");
    try {
      await apiFetch("/recovery/sync-status", {
        method: "PATCH",
        body: JSON.stringify({
          item_type: item.item_type,
          item_id: item.item_id,
          incident_id: activeIncident?.id,
          sync_status: syncStatus,
          sync_error: syncStatus === "failed" ? "Marked failed during recovery review" : null,
        }),
      });
      await loadRecovery();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update sync status");
    } finally {
      setUpdating(null);
    }
  }

  async function downloadFhirBundle() {
    if (!activeIncident) {
      setError("No active incident available for FHIR export.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/recovery/incidents/${activeIncident.id}/fhir-bundle`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = new Blob([JSON.stringify(await response.json(), null, 2)], { type: "application/fhir+json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `blackoutcare-fhir-incident-${activeIncident.id}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download FHIR bundle.");
    }
  }

  return (
    <DashboardShell active="recovery">
      <div className="mx-auto max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Recovery Sync Center</h1>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">
              Review downtime records before reconciliation with restored hospital systems
            </p>
          </div>
          <button
            onClick={downloadFhirBundle}
            disabled={!activeIncident}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-bold text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-5 w-5" />
            FHIR Bundle
          </button>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        {!loading && !activeIncident && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <RefreshCcw className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 text-xl font-black">No Active Incident</h2>
            <p className="mt-2 text-slate-500">Start an incident from the dashboard to create a recovery queue.</p>
          </section>
        )}

        {preview && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Total" value={preview.summary.total_items} />
              <Metric label="Pending" value={preview.summary.pending} />
              <Metric label="Reviewed" value={preview.summary.reviewed} />
              <Metric label="Synced" value={preview.summary.synced} />
              <Metric label="Needs Manual" value={preview.summary.manual_entry_required + preview.summary.failed} tone="amber" />
            </section>

            <section className="mt-8 grid gap-6">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-teal-600" />
                    <h2 className="text-lg font-black">{titleCase(group)}</h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{items.length}</span>
                  </div>
                  <div className="mt-5 divide-y divide-slate-100">
                    {items.map((item) => (
                      <article key={`${item.item_type}-${item.item_id}`} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold">{item.label}</p>
                            <span className={`rounded-md px-2 py-1 text-xs font-black ${item.readiness === "ready" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {titleCase(item.readiness)}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                              {titleCase(item.sync_status)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                          {item.sync_error && <p className="mt-2 text-sm text-red-600">{item.sync_error}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {statuses.map((status) => (
                            <button
                              key={status}
                              onClick={() => updateStatus(item, status)}
                              disabled={updating === `${item.item_type}-${item.item_id}`}
                              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              {titleCase(status)}
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {loading && <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading recovery queue...</div>}
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "amber" }) {
  return (
    <div className={`rounded-2xl border p-5 text-center shadow-sm ${tone === "amber" ? "border-amber-100 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-2 text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}
