"use client";

import {
  API_URL,
  apiFetch,
  formatDateTime,
  titleCase,
  type AIAnalysisResult,
  type CaseNote,
  type Patient,
  type ProtocolChecklistItem,
  type TriageCase,
  type VitalsEntry,
} from "@/lib/api";
import { ChevronDown, Filter, Plus, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";

export default function TriagePage() {
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedCase, setSelectedCase] = useState<TriageCase | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [notes, setNotes] = useState<CaseNote[]>([]);
  const [vitalsEntries, setVitalsEntries] = useState<VitalsEntry[]>([]);
  const [checklist, setChecklist] = useState<ProtocolChecklistItem[]>([]);
  const [noteForm, setNoteForm] = useState({ note_type: "clinical", content: "" });
  const [vitalsForm, setVitalsForm] = useState({ blood_pressure: "", heart_rate: "", respiratory_rate: "", oxygen_saturation: "", temperature_c: "", pain_score: "", trend: "unknown", notes: "" });
  const [checklistForm, setChecklistForm] = useState({ label: "" });
  const [reviewForm, setReviewForm] = useState({ review_status: "accepted", review_note: "" });
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
      const [data, noteData, vitalsData, checklistData] = await Promise.all([
        apiFetch<TriageCase>(`/triage/cases/${caseId}`),
        apiFetch<CaseNote[]>(`/triage/cases/${caseId}/notes/`),
        apiFetch<VitalsEntry[]>(`/triage/cases/${caseId}/vitals`),
        apiFetch<ProtocolChecklistItem[]>(`/triage/cases/${caseId}/checklist`),
      ]);
      setSelectedCase(data);
      setNotes(noteData);
      setVitalsEntries(vitalsData);
      setChecklist(checklistData);
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

  async function createVitalsEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCase) return;

    try {
      const entry = await apiFetch<VitalsEntry>(`/triage/cases/${selectedCase.id}/vitals`, {
        method: "POST",
        body: JSON.stringify({
          blood_pressure: vitalsForm.blood_pressure || null,
          heart_rate: vitalsForm.heart_rate || null,
          respiratory_rate: vitalsForm.respiratory_rate || null,
          oxygen_saturation: vitalsForm.oxygen_saturation || null,
          temperature_c: vitalsForm.temperature_c || null,
          pain_score: vitalsForm.pain_score || null,
          trend: vitalsForm.trend,
          notes: vitalsForm.notes || null,
        }),
      });
      setVitalsEntries((items) => [...items, entry]);
      setVitalsForm({ blood_pressure: "", heart_rate: "", respiratory_rate: "", oxygen_saturation: "", temperature_c: "", pain_score: "", trend: "unknown", notes: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record vitals");
    }
  }

  async function createChecklistItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCase) return;

    try {
      const item = await apiFetch<ProtocolChecklistItem>(`/triage/cases/${selectedCase.id}/checklist`, {
        method: "POST",
        body: JSON.stringify({ label: checklistForm.label }),
      });
      setChecklist((items) => [...items, item]);
      setChecklistForm({ label: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add protocol action");
    }
  }

  async function updateChecklistItem(item: ProtocolChecklistItem, status: ProtocolChecklistItem["status"]) {
    try {
      const updated = await apiFetch<ProtocolChecklistItem>(`/triage/cases/checklist/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setChecklist((items) => items.map((entry) => (entry.id === updated.id ? updated : entry)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update protocol action");
    }
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCase) return;

    try {
      const note = await apiFetch<CaseNote>(`/triage/cases/${selectedCase.id}/notes/`, {
        method: "POST",
        body: JSON.stringify(noteForm),
      });
      setNotes((items) => [...items, note]);
      setNoteForm({ note_type: "clinical", content: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add note");
    }
  }

  async function reviewRecommendation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analysis) return;

    try {
      await apiFetch(`/ai/recommendations/${analysis.recommendation_id}/review`, {
        method: "PATCH",
        body: JSON.stringify(reviewForm),
      });
      setAnalysis({
        ...analysis,
        ai_output: {
          ...analysis.ai_output,
          protocol_reasoning: [
            ...(analysis.ai_output.protocol_reasoning || []),
            `Reviewed: ${titleCase(reviewForm.review_status)}`,
          ],
        },
      });
      setReviewForm({ review_status: "accepted", review_note: "" });
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Unable to review recommendation");
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
    try {
      const endpoint = format === "json" ? `${API_URL}/exports/triage-case/${caseId}` : `${API_URL}/exports/triage-case/${caseId}/pdf`;
      const response = await fetch(endpoint, { credentials: "include" });
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
            {analysis && <AnalysisPanel analysis={analysis} reviewForm={reviewForm} setReviewForm={setReviewForm} onReview={reviewRecommendation} />}
            <section className="mt-5 grid gap-5 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-lg font-black">Vitals Timeline</h3>
                <form onSubmit={createVitalsEntry} className="mt-4 grid gap-3 md:grid-cols-2">
                  <Input label="Blood Pressure" value={vitalsForm.blood_pressure} onChange={(value) => setVitalsForm({ ...vitalsForm, blood_pressure: value })} />
                  <Input label="Heart Rate" value={vitalsForm.heart_rate} onChange={(value) => setVitalsForm({ ...vitalsForm, heart_rate: value })} />
                  <Input label="Resp. Rate" value={vitalsForm.respiratory_rate} onChange={(value) => setVitalsForm({ ...vitalsForm, respiratory_rate: value })} />
                  <Input label="O2 Sat" value={vitalsForm.oxygen_saturation} onChange={(value) => setVitalsForm({ ...vitalsForm, oxygen_saturation: value })} />
                  <Input label="Temp C" value={vitalsForm.temperature_c} onChange={(value) => setVitalsForm({ ...vitalsForm, temperature_c: value })} />
                  <Input label="Pain Score" value={vitalsForm.pain_score} onChange={(value) => setVitalsForm({ ...vitalsForm, pain_score: value })} />
                  <Select label="Trend" value={vitalsForm.trend} onChange={(value) => setVitalsForm({ ...vitalsForm, trend: value })} options={["unknown", "unchanged", "improving", "worsening"]} />
                  <Input label="Notes" value={vitalsForm.notes} onChange={(value) => setVitalsForm({ ...vitalsForm, notes: value })} />
                  <div className="md:col-span-2">
                    <button className="h-11 w-full rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">Record Vitals</button>
                  </div>
                </form>
                <div className="mt-4 grid gap-3">
                  {vitalsEntries.map((entry) => (
                    <article key={entry.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-slate-700">{titleCase(entry.trend)} trend</p>
                        <p className="text-xs text-slate-500">{formatDateTime(entry.created_at)}</p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {[entry.blood_pressure && `BP ${entry.blood_pressure}`, entry.heart_rate && `HR ${entry.heart_rate}`, entry.oxygen_saturation && `O2 ${entry.oxygen_saturation}`, entry.respiratory_rate && `RR ${entry.respiratory_rate}`, entry.temperature_c && `Temp ${entry.temperature_c}C`, entry.pain_score && `Pain ${entry.pain_score}`].filter(Boolean).join(" - ") || "Vitals recorded"}
                      </p>
                      {entry.notes && <p className="mt-2 text-sm text-slate-500">{entry.notes}</p>}
                    </article>
                  ))}
                  {vitalsEntries.length === 0 && <p className="text-sm text-slate-500">No vitals entries yet.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-lg font-black">Protocol Action Checklist</h3>
                <form onSubmit={createChecklistItem} className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem]">
                  <input required value={checklistForm.label} onChange={(event) => setChecklistForm({ label: event.target.value })} placeholder="Add protocol action..." className="h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" />
                  <button className="h-11 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">Add Action</button>
                </form>
                <div className="mt-4 grid gap-3">
                  {checklist.map((item) => (
                    <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-700">{item.label}</p>
                          {item.clinician_note && <p className="mt-2 text-sm text-slate-500">{item.clinician_note}</p>}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {["pending", "done", "skipped"].map((statusOption) => (
                            <button key={statusOption} type="button" onClick={() => updateChecklistItem(item, statusOption as ProtocolChecklistItem["status"])} className={`rounded-lg border px-3 py-1 text-xs font-bold ${item.status === statusOption ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                              {titleCase(statusOption)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))}
                  {checklist.length === 0 && <p className="text-sm text-slate-500">No protocol actions yet.</p>}
                </div>
              </div>
            </section>
            <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-black">Case Notes Timeline</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "SBAR", content: "Situation: \nBackground: \nAssessment: \nRecommendation: " },
                  { label: "Escalation", content: "Escalated to: \nReason: \nImmediate actions: " },
                  { label: "Handoff", content: "Handoff risks: \nPending actions: \nNext review time: " },
                ].map((template) => (
                  <button key={template.label} type="button" onClick={() => setNoteForm({ note_type: template.label === "Escalation" ? "escalation" : "handoff", content: template.content })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                    {template.label}
                  </button>
                ))}
              </div>
              <form onSubmit={createNote} className="mt-4 grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)_9rem]">
                <select value={noteForm.note_type} onChange={(event) => setNoteForm({ ...noteForm, note_type: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100">
                  {["clinical", "vitals", "handoff", "escalation"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
                </select>
                <input required value={noteForm.content} onChange={(event) => setNoteForm({ ...noteForm, content: event.target.value })} placeholder="Add note..." className="h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" />
                <button className="h-11 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800">Add Note</button>
              </form>
              <div className="mt-4 grid gap-3">
                {notes.map((note) => (
                  <article key={note.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-700">{titleCase(note.note_type)}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(note.created_at)} by User {note.author_id}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{note.content}</p>
                  </article>
                ))}
                {notes.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}
              </div>
            </section>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

function AnalysisPanel({
  analysis,
  reviewForm,
  setReviewForm,
  onReview,
}: {
  analysis: AIAnalysisResult;
  reviewForm: { review_status: string; review_note: string };
  setReviewForm: (value: { review_status: string; review_note: string }) => void;
  onReview: (event: FormEvent<HTMLFormElement>) => void;
}) {
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
      <form onSubmit={onReview} className="mt-5 grid gap-3 rounded-xl border border-teal-100 bg-white p-4 md:grid-cols-[12rem_minmax(0,1fr)_9rem]">
        <select value={reviewForm.review_status} onChange={(event) => setReviewForm({ ...reviewForm, review_status: event.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100">
          {["accepted", "rejected", "needs_review"].map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
        </select>
        <input value={reviewForm.review_note} onChange={(event) => setReviewForm({ ...reviewForm, review_note: event.target.value })} placeholder="Review note" className="h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" />
        <button className="h-11 rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700">Review</button>
      </form>
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
