"use client";

import { API_URL, apiFetch, formatDateTime, getToken, titleCase, type AIAnalysisResult, type Patient, type TriageCase } from "@/lib/api";
import { ChevronDown, Filter, Plus, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";

export default function TriagePage() {
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedCase, setSelectedCase] = useState<TriageCase | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [urgency, setUrgency] = useState("");
  const [status, setStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ patient_id: "", chief_complaint: "", symptoms: "", vitals: "", urgency_level: "unassigned", status: "active" });
  const [editForm, setEditForm] = useState({ chief_complaint: "", symptoms: "", vitals: "", urgency_level: "unassigned", status: "active" });

  const patientsById = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients]);

  async function loadData(nextUrgency = urgency, nextStatus = status) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (nextUrgency) params.set("urgency_level", nextUrgency);
      if (nextStatus) params.set("status", nextStatus);
      const [caseData, patientData] = await Promise.all([
        apiFetch<TriageCase[]>(`/triage/cases/?${params}`),
        apiFetch<Patient[]>("/patients/?limit=500"),
      ]);
      setCases(caseData);
      setPatients(patientData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load triage cases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [caseData, patientData] = await Promise.all([
          apiFetch<TriageCase[]>("/triage/cases/?limit=500"),
          apiFetch<Patient[]>("/patients/?limit=500"),
        ]);
        if (active) {
          setCases(caseData);
          setPatients(patientData);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load triage cases");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, []);

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch<TriageCase>("/triage/cases/", {
        method: "POST",
        body: JSON.stringify({
          patient_id: Number(form.patient_id),
          created_by: 0,
          chief_complaint: form.chief_complaint,
          symptoms: form.symptoms || null,
          vitals: form.vitals || null,
          urgency_level: form.urgency_level,
          status: form.status,
        }),
      });
      setShowCreate(false);
      setForm({ patient_id: "", chief_complaint: "", symptoms: "", vitals: "", urgency_level: "unassigned", status: "active" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create triage case");
    } finally {
      setSaving(false);
    }
  }

  async function selectCase(caseId: number) {
    setAnalysis(null);
    setAnalysisError("");
    try {
      const data = await apiFetch<TriageCase>(`/triage/cases/${caseId}`);
      setSelectedCase(data);
      setEditForm({
        chief_complaint: data.chief_complaint,
        symptoms: data.symptoms || "",
        vitals: data.vitals || "",
        urgency_level: data.urgency_level,
        status: data.status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load triage case");
    }
  }

  async function updateStatus(caseId: number, nextStatus: TriageCase["status"]) {
    try {
      const updated = await apiFetch<TriageCase>(`/triage/cases/${caseId}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      setCases((items) => items.map((item) => (item.id === caseId ? updated : item)));
      setSelectedCase(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status");
    }
  }

  async function analyzeCase(caseId: number) {
    setAnalyzing(caseId);
    setAnalysis(null);
    setAnalysisError("");
    try {
      const result = await apiFetch<AIAnalysisResult>(`/triage/cases/${caseId}/analyze`, { method: "POST" });
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Unable to analyze case");
    } finally {
      setAnalyzing(null);
    }
  }

  async function saveCaseEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCase) return;

    setSaving(true);
    setError("");
    try {
      const updated = await apiFetch<TriageCase>(`/triage/cases/${selectedCase.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          chief_complaint: editForm.chief_complaint,
          symptoms: editForm.symptoms || null,
          vitals: editForm.vitals || null,
          urgency_level: editForm.urgency_level,
          status: editForm.status,
        }),
      });
      setSelectedCase(updated);
      setCases((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update triage case");
    } finally {
      setSaving(false);
    }
  }

  async function downloadCaseReport(caseId: number, format: "json" | "pdf") {
    const token = getToken();
    if (!token) {
      setError("Login token not found. Please sign in again to download reports.");
      return;
    }

    try {
      const endpoint = format === "json" ? `${API_URL}/exports/triage-case/${caseId}` : `${API_URL}/exports/triage-case/${caseId}/pdf`;
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Download failed");
      const blob = format === "json" ? new Blob([JSON.stringify(await response.json(), null, 2)], { type: "application/json" }) : await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `triage-case-${caseId}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download case report");
    }
  }

  return (
    <DashboardShell active="triage">
      <div className="mx-auto max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Triage Cases</h1>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">Clinical triage workflow management</p>
          </div>
          <button onClick={() => setShowCreate((value) => !value)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-bold text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700">
            <Plus className="h-5 w-5" />
            New Case
          </button>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        {showCreate && (
          <form onSubmit={createCase} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Patient
              <select required value={form.patient_id} onChange={(event) => setForm({ ...form, patient_id: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100">
                <option value="">Select patient</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.patient_code} - {patient.full_name || "Unnamed"}</option>)}
              </select>
            </label>
            <Input label="Chief Complaint" value={form.chief_complaint} onChange={(value) => setForm({ ...form, chief_complaint: value })} required />
            <Select label="Urgency" value={form.urgency_level} onChange={(value) => setForm({ ...form, urgency_level: value })} options={["unassigned", "stable", "urgent", "critical"]} />
            <Select label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })} options={["active", "monitoring", "escalated", "closed"]} />
            <Input label="Symptoms" value={form.symptoms} onChange={(value) => setForm({ ...form, symptoms: value })} />
            <Input label="Vitals" value={form.vitals} onChange={(value) => setForm({ ...form, vitals: value })} />
            <div className="flex items-end"><button disabled={saving} className="h-11 w-full rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? "Saving..." : "Create Case"}</button></div>
          </form>
        )}

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-5 w-5 text-slate-500" />
            <FilterSelect label="All Urgency" value={urgency} onChange={(value) => { setUrgency(value); loadData(value, status); }} options={["critical", "urgent", "stable", "unassigned"]} />
            <FilterSelect label="All Status" value={status} onChange={(value) => { setStatus(value); loadData(urgency, value); }} options={["active", "monitoring", "escalated", "closed"]} />
          </div>
          <p className="text-sm font-medium text-slate-500 sm:text-base">{cases.length} cases</p>
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {cases.map((item) => <TriageCard key={item.id} item={item} patient={patientsById.get(item.patient_id)} onSelect={() => selectCase(item.id)} />)}
        </section>
        {!loading && cases.length === 0 && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">No triage cases found.</div>}
        {loading && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading triage cases...</div>}

        {selectedCase && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-sm font-bold text-slate-500">TC-{String(selectedCase.id).padStart(3, "0")}</p>
                <h2 className="mt-2 text-xl font-black">{patientsById.get(selectedCase.patient_id)?.full_name || `Patient ${selectedCase.patient_id}`}</h2>
                <p className="mt-2 text-slate-600">{selectedCase.chief_complaint}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => analyzeCase(selectedCase.id)} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">{analyzing === selectedCase.id ? "Analyzing..." : "Analyze"}</button>
                <button onClick={() => downloadCaseReport(selectedCase.id, "json")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">JSON</button>
                <button onClick={() => downloadCaseReport(selectedCase.id, "pdf")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">PDF</button>
                <button onClick={() => setSelectedCase(null)} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Close</button>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Select label="Update Status" value={selectedCase.status} onChange={(value) => updateStatus(selectedCase.id, value as TriageCase["status"])} options={["active", "monitoring", "escalated", "closed"]} />
              <Detail label="Urgency" value={titleCase(selectedCase.urgency_level)} />
              <Detail label="Created" value={formatDateTime(selectedCase.created_at)} />
              <Detail label="Symptoms" value={selectedCase.symptoms || "-"} />
              <Detail label="Vitals" value={selectedCase.vitals || "-"} />
            </div>
            <form onSubmit={saveCaseEdits} className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <Input label="Chief Complaint" value={editForm.chief_complaint} onChange={(value) => setEditForm({ ...editForm, chief_complaint: value })} required />
              <Select label="Urgency" value={editForm.urgency_level} onChange={(value) => setEditForm({ ...editForm, urgency_level: value })} options={["unassigned", "stable", "urgent", "critical"]} />
              <Select label="Status" value={editForm.status} onChange={(value) => setEditForm({ ...editForm, status: value })} options={["active", "monitoring", "escalated", "closed"]} />
              <Input label="Symptoms" value={editForm.symptoms} onChange={(value) => setEditForm({ ...editForm, symptoms: value })} />
              <Input label="Vitals" value={editForm.vitals} onChange={(value) => setEditForm({ ...editForm, vitals: value })} />
              <div className="flex items-end">
                <button disabled={saving} className="h-11 w-full rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800 disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
            {analysisError && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{analysisError}</div>}
            {analysis && <AnalysisPanel analysis={analysis} />}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

function AnalysisPanel({ analysis }: { analysis: AIAnalysisResult }) {
  const output = analysis.ai_output;
  return (
    <section className="mt-5 rounded-xl border border-teal-100 bg-teal-50/60 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-teal-700">AI Recommendation</p>
          <h3 className="mt-2 text-xl font-black">{titleCase(output.urgency || "unassigned")} urgency</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-600">Confidence: {titleCase(output.confidence || "low")}</span>
      </div>
      <p className="mt-4 leading-7 text-slate-700">{output.risk_summary || "No summary returned."}</p>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <ListBlock title="Recommended Actions" items={output.recommended_actions || []} />
        <ListBlock title="Warnings" items={output.warnings || []} tone="red" />
        <ListBlock title="Protocol Reasoning" items={output.protocol_reasoning || []} />
        <Detail label="Source" value={output.source || "fallback"} />
      </div>
    </section>
  );
}

function ListBlock({ title, items, tone = "slate" }: { title: string; items: string[]; tone?: "slate" | "red" }) {
  return (
    <div>
      <p className={`text-sm font-black ${tone === "red" ? "text-red-700" : "text-slate-700"}`}>{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
          {items.map((item) => <li key={item}>- {item}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">None returned.</p>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="relative">
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-40 appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none hover:bg-slate-50 sm:text-base">
        <option value="">{label}</option>
        {options.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-slate-500" />
    </label>
  );
}

function TriageCard({ item, patient, onSelect }: { item: TriageCase; patient?: Patient; onSelect: () => void }) {
  const tone = item.urgency_level === "critical" ? "red" : item.urgency_level === "urgent" ? "orange" : item.urgency_level === "stable" ? "green" : "amber";
  const toneClasses = {
    red: { border: "border-l-red-500", badge: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
    orange: { border: "border-l-orange-500", badge: "border-orange-200 bg-orange-50 text-orange-700", dot: "bg-orange-500" },
    green: { border: "border-l-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    amber: { border: "border-l-amber-500", badge: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  };
  const statusClass = item.status === "active" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-violet-200 bg-violet-50 text-violet-700";

  return (
    <article onClick={onSelect} className={`cursor-pointer rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClasses[tone].border}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-bold text-slate-500 sm:text-base">TC-{String(item.id).padStart(3, "0")}</p>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${toneClasses[tone].badge}`}><span className={`h-2 w-2 rounded-full ${toneClasses[tone].dot}`} />{titleCase(item.urgency_level)}</span>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold sm:text-sm ${statusClass}`}>{titleCase(item.status)}</span>
      </div>
      <h2 className="mt-5 text-lg font-black">{patient?.full_name || patient?.patient_code || `Patient ${item.patient_id}`}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500 sm:text-base">{item.chief_complaint}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <span>{formatDateTime(item.created_at)}</span>
        <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" />User {item.created_by}</span>
      </div>
    </article>
  );
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100">
        {options.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-900">{value}</p>
    </div>
  );
}
