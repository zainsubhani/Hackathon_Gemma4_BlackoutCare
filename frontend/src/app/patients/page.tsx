"use client";

import { Plus, Search } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { PaginationBar, usePagination } from "@/components/Pagination";
import { apiFetch, formatDateTime, titleCase, type Patient } from "@/lib/api";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patient_code: "",
    full_name: "",
    age: "",
    gender: "unknown",
    allergy_status: "unknown",
    known_conditions: "",
    current_medications: "",
  });
  const [editForm, setEditForm] = useState({
    patient_code: "",
    full_name: "",
    age: "",
    gender: "unknown",
    allergy_status: "unknown",
    known_conditions: "",
    current_medications: "",
  });

  const visiblePatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) =>
      patient.patient_code.toLowerCase().includes(query) ||
      (patient.full_name || "").toLowerCase().includes(query),
    );
  }, [patients, search]);
  const patientPage = usePagination(visiblePatients, 8);

  async function loadPatients() {
    setLoading(true);
    setError("");
    try {
      setPatients(await apiFetch<Patient[]>("/patients/?limit=500"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load patients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialPatients() {
      try {
        const data = await apiFetch<Patient[]>("/patients/?limit=500");
        if (active) setPatients(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load patients");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialPatients();
    return () => {
      active = false;
    };
  }, []);

  async function createPatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiFetch<Patient>("/patients/", {
        method: "POST",
        body: JSON.stringify({
          patient_code: form.patient_code,
          full_name: form.full_name || null,
          age: form.age ? Number(form.age) : null,
          gender: form.gender,
          allergy_status: form.allergy_status,
          known_conditions: form.known_conditions || null,
          current_medications: form.current_medications || null,
        }),
      });
      setShowCreate(false);
      setForm({ patient_code: "", full_name: "", age: "", gender: "unknown", allergy_status: "unknown", known_conditions: "", current_medications: "" });
      await loadPatients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create patient");
    } finally {
      setSaving(false);
    }
  }

  async function selectPatient(patientId: number) {
    try {
      const data = await apiFetch<Patient>(`/patients/${patientId}`);
      setSelectedPatient(data);
      setEditForm({
        patient_code: data.patient_code,
        full_name: data.full_name || "",
        age: data.age ? String(data.age) : "",
        gender: data.gender,
        allergy_status: data.allergy_status,
        known_conditions: data.known_conditions || "",
        current_medications: data.current_medications || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load patient");
    }
  }

  async function updatePatient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPatient) return;
    setSaving(true);
    setError("");
    try {
      const updated = await apiFetch<Patient>(`/patients/${selectedPatient.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          patient_code: editForm.patient_code,
          full_name: editForm.full_name || null,
          age: editForm.age ? Number(editForm.age) : null,
          gender: editForm.gender,
          allergy_status: editForm.allergy_status,
          known_conditions: editForm.known_conditions || null,
          current_medications: editForm.current_medications || null,
        }),
      });
      setSelectedPatient(updated);
      setPatients((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update patient");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell active="patients">
      <div className="mx-auto max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Patients</h1>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">Downtime patient registry</p>
          </div>
          <button onClick={() => setShowCreate((value) => !value)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-bold text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700">
            <Plus className="h-5 w-5" />
            Register Patient
          </button>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        {showCreate && (
          <form onSubmit={createPatient} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4">
            <Input label="Patient Code" value={form.patient_code} onChange={(value) => setForm({ ...form, patient_code: value.toUpperCase() })} required />
            <Input label="Full Name" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} />
            <Input label="Age" type="number" value={form.age} onChange={(value) => setForm({ ...form, age: value })} />
            <Select label="Gender" value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} options={["unknown", "female", "male", "other"]} />
            <Select label="Allergy Status" value={form.allergy_status} onChange={(value) => setForm({ ...form, allergy_status: value })} options={["unknown", "none", "known"]} />
            <Input label="Known Conditions" value={form.known_conditions} onChange={(value) => setForm({ ...form, known_conditions: value })} />
            <Input label="Current Medications" value={form.current_medications} onChange={(value) => setForm({ ...form, current_medications: value })} />
            <div className="flex items-end">
              <button disabled={saving} className="h-11 w-full rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving ? "Saving..." : "Create Patient"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 flex w-full max-w-xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-500 shadow-sm">
          <Search className="h-5 w-5 shrink-0" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); patientPage.setCurrentPage(1); }} className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base" placeholder="Search by name or code..." />
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 pt-4">
            <PaginationBar {...patientPage} totalItems={visiblePatients.length} itemLabel="patients" disabled={loading || visiblePatients.length === 0} onPageChange={patientPage.setCurrentPage} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <thead className="bg-slate-50 text-sm font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Code</th>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Age</th>
                  <th className="px-5 py-4">Gender</th>
                  <th className="px-5 py-4">Allergies</th>
                  <th className="px-5 py-4">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patientPage.paginatedItems.map((patient) => (
                  <tr key={patient.id} onClick={() => selectPatient(patient.id)} className="cursor-pointer transition hover:bg-slate-50/80">
                    <td className="px-5 py-5 font-mono text-sm font-bold text-slate-900">{patient.patient_code}</td>
                    <td className="px-5 py-5 text-base font-bold text-slate-900">{patient.full_name || "Unnamed patient"}</td>
                    <td className="px-5 py-5 text-slate-500">{patient.age ?? "-"}</td>
                    <td className="px-5 py-5 text-slate-500">{titleCase(patient.gender)}</td>
                    <td className="px-5 py-5"><StatusBadge status={patient.allergy_status} /></td>
                    <td className="px-5 py-5 text-slate-500">{formatDateTime(patient.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && visiblePatients.length === 0 && <div className="px-5 py-10 text-center text-slate-500">No patients found.</div>}
            {loading && <div className="px-5 py-10 text-center text-slate-500">Loading patients...</div>}
          </div>
        </section>

        {selectedPatient && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">{selectedPatient.full_name || selectedPatient.patient_code}</h2>
                <p className="mt-1 font-mono text-sm text-slate-500">{selectedPatient.patient_code}</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Age" value={selectedPatient.age ?? "-"} />
              <Detail label="Gender" value={titleCase(selectedPatient.gender)} />
              <Detail label="Allergy Status" value={titleCase(selectedPatient.allergy_status)} />
              <Detail label="Registered" value={formatDateTime(selectedPatient.created_at)} />
              <Detail label="Known Conditions" value={selectedPatient.known_conditions || "-"} />
              <Detail label="Current Medications" value={selectedPatient.current_medications || "-"} />
            </div>
            <form onSubmit={updatePatient} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
              <Input label="Patient Code" value={editForm.patient_code} onChange={(value) => setEditForm({ ...editForm, patient_code: value.toUpperCase() })} required />
              <Input label="Full Name" value={editForm.full_name} onChange={(value) => setEditForm({ ...editForm, full_name: value })} />
              <Input label="Age" type="number" value={editForm.age} onChange={(value) => setEditForm({ ...editForm, age: value })} />
              <Select label="Gender" value={editForm.gender} onChange={(value) => setEditForm({ ...editForm, gender: value })} options={["unknown", "female", "male", "other"]} />
              <Select label="Allergy Status" value={editForm.allergy_status} onChange={(value) => setEditForm({ ...editForm, allergy_status: value })} options={["unknown", "none", "known"]} />
              <Input label="Known Conditions" value={editForm.known_conditions} onChange={(value) => setEditForm({ ...editForm, known_conditions: value })} />
              <Input label="Current Medications" value={editForm.current_medications} onChange={(value) => setEditForm({ ...editForm, current_medications: value })} />
              <div className="flex items-end">
                <button disabled={saving} className="h-11 w-full rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800 disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

function StatusBadge({ status }: { status: Patient["allergy_status"] }) {
  const className = status === "known" ? "border-red-200 bg-red-50 text-red-700" : status === "none" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-blue-700";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${className}`}>{titleCase(status)}</span>;
}

function Input({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" />
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

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-slate-900">{value}</p>
    </div>
  );
}
