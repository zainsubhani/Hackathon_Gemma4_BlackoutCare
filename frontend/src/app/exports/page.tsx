"use client";

import { AlertTriangle, CalendarDays, Download, FileJson, FileText, Stethoscope, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { API_URL, apiFetch, getToken, type Patient, type TriageCase } from "@/lib/api";

export default function ExportsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [triageCases, setTriageCases] = useState<TriageCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<"json" | "pdf" | null>(null);
  const [error, setError] = useState("");

  const generatedTime = useMemo(
    () => new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()),
    [],
  );
  const criticalActive = triageCases.filter((item) => item.urgency_level === "critical" && item.status !== "closed").length;

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        const [patientData, caseData] = await Promise.all([
          apiFetch<Patient[]>("/patients/?limit=500"),
          apiFetch<TriageCase[]>("/triage/cases/?limit=500"),
        ]);
        if (active) {
          setPatients(patientData);
          setTriageCases(caseData);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load export summary");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      active = false;
    };
  }, []);

  async function downloadReport(format: "json" | "pdf") {
    const token = getToken();
    if (!token) {
      setError("Login token not found. Please sign in again to download reports.");
      return;
    }

    setError("");
    setDownloading(format);

    try {
      const endpoint = format === "json" ? `${API_URL}/exports/downtime-report` : `${API_URL}/exports/downtime-report/pdf`;
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Download failed");

      const blob = format === "json"
        ? new Blob([JSON.stringify(await response.json(), null, 2)], { type: "application/json" })
        : await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `blackoutcare-downtime-report-${Date.now()}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download report from the backend.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <DashboardShell active="exports">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Export Reports</h1>
          <p className="mt-2 text-base text-slate-500 sm:text-lg">
            Generate and download downtime documentation
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Report Summary</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem icon={UsersRound} value={loading ? "-" : String(patients.length)} label="Patients" />
            <SummaryItem icon={Stethoscope} value={loading ? "-" : String(triageCases.length)} label="Triage Cases" />
            <SummaryItem icon={AlertTriangle} value={loading ? "-" : String(criticalActive)} label="Critical Active" tone="red" />
            <SummaryItem icon={CalendarDays} value={generatedTime} label="Generated" />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <ReportCard
            icon={FileJson}
            title="JSON Report"
            text="Full structured downtime report with all patients, triage cases, recommendations, and audit trail."
            buttonText={downloading === "json" ? "Downloading..." : "Download"}
            disabled={downloading !== null}
            onDownload={() => downloadReport("json")}
          />
          <ReportCard
            icon={FileText}
            title="PDF Report"
            text="Backend-generated clinical downtime report formatted for review, handoff, and recovery documentation."
            buttonText={downloading === "pdf" ? "Downloading..." : "Download"}
            disabled={downloading !== null}
            onDownload={() => downloadReport("pdf")}
          />
        </section>
      </div>
    </DashboardShell>
  );
}

function SummaryItem({
  icon: Icon,
  value,
  label,
  tone = "slate",
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  tone?: "slate" | "red";
}) {
  return (
    <div className="text-center">
      <Icon className={`mx-auto h-7 w-7 ${tone === "red" ? "text-red-500" : "text-slate-500"}`} />
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">{label}</p>
    </div>
  );
}

function ReportCard({
  icon: Icon,
  title,
  text,
  buttonText,
  disabled,
  onDownload,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  buttonText: string;
  disabled: boolean;
  onDownload: () => void;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <Icon className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">{text}</p>
        </div>
      </div>

      <button
        onClick={onDownload}
        disabled={disabled}
        className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="h-5 w-5" />
        {buttonText}
      </button>
    </article>
  );
}
