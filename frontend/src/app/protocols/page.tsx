"use client";

import { CheckCircle2, Plus, Search, Tag } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { apiFetch, titleCase, type Protocol, type ProtocolSearchResult } from "@/lib/api";

export default function ProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [matches, setMatches] = useState<ProtocolSearchResult[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", category: "", trigger_keywords: "", content: "", version: "v1" });
  const [editForm, setEditForm] = useState({ title: "", category: "", trigger_keywords: "", content: "", version: "v1" });

  const matchMap = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches]);
  const visibleProtocols = useMemo(() => {
    if (!search.trim()) return protocols;
    if (matches.length > 0) {
      const ids = new Set(matches.map((match) => match.id));
      return protocols.filter((protocol) => ids.has(protocol.id));
    }
    const query = search.toLowerCase();
    return protocols.filter((protocol) =>
      [protocol.title, protocol.category, protocol.trigger_keywords].some((value) => value.toLowerCase().includes(query)),
    );
  }, [matches, protocols, search]);

  async function loadProtocols() {
    setLoading(true);
    setError("");
    try {
      setProtocols(await apiFetch<Protocol[]>("/protocols/?limit=500"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load protocols");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialProtocols() {
      try {
        const data = await apiFetch<Protocol[]>("/protocols/?limit=500");
        if (active) setProtocols(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load protocols");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialProtocols();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) return;

    const timeout = window.setTimeout(async () => {
      try {
        setMatches(await apiFetch<ProtocolSearchResult[]>("/protocols/search", {
          method: "POST",
          body: JSON.stringify({ query }),
        }));
      } catch {
        setMatches([]);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  async function createProtocol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiFetch<Protocol>("/protocols/", { method: "POST", body: JSON.stringify(form) });
      setShowCreate(false);
      setForm({ title: "", category: "", trigger_keywords: "", content: "", version: "v1" });
      await loadProtocols();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create protocol");
    } finally {
      setSaving(false);
    }
  }

  async function selectProtocol(protocolId: number) {
    try {
      const data = await apiFetch<Protocol>(`/protocols/${protocolId}`);
      setSelectedProtocol(data);
      setEditForm({
        title: data.title,
        category: data.category,
        trigger_keywords: data.trigger_keywords,
        content: data.content,
        version: data.version,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load protocol");
    }
  }

  async function updateProtocol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProtocol) return;
    setSaving(true);
    setError("");
    try {
      const updated = await apiFetch<Protocol>(`/protocols/${selectedProtocol.id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      setSelectedProtocol(updated);
      setProtocols((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update protocol");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell active="protocols">
      <div className="mx-auto max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Clinical Protocols</h1>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">Downtime protocol library</p>
          </div>
          <button onClick={() => setShowCreate((value) => !value)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-bold text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700">
            <Plus className="h-5 w-5" />
            Add Protocol
          </button>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        {showCreate && (
          <form onSubmit={createProtocol} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
            <Input label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
            <Input label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} required />
            <Input label="Trigger Keywords" value={form.trigger_keywords} onChange={(value) => setForm({ ...form, trigger_keywords: value })} required />
            <Input label="Version" value={form.version} onChange={(value) => setForm({ ...form, version: value })} required />
            <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
              Content
              <textarea required value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="min-h-28 rounded-xl border border-slate-200 p-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" />
            </label>
            <div className="md:col-span-2">
              <button disabled={saving} className="h-11 rounded-xl bg-teal-600 px-5 font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving ? "Saving..." : "Create Protocol"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 flex w-full max-w-xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-500 shadow-sm">
          <Search className="h-5 w-5 shrink-0" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); if (event.target.value.trim().length < 2) setMatches([]); }} className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base" placeholder="Search protocols by title or keyword..." />
        </div>

        <section className="mt-6 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {visibleProtocols.map((protocol) => (
            <ProtocolCard key={protocol.id} protocol={protocol} match={matchMap.get(protocol.id)} onSelect={() => selectProtocol(protocol.id)} />
          ))}
        </section>
        {!loading && visibleProtocols.length === 0 && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">No protocols found.</div>}
        {loading && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading protocols...</div>}

        {selectedProtocol && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-teal-600">{selectedProtocol.category}</p>
                <h2 className="mt-2 text-xl font-black">{selectedProtocol.title}</h2>
              </div>
              <button onClick={() => setSelectedProtocol(null)} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedProtocol.content}</p>
            <form onSubmit={updateProtocol} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <Input label="Title" value={editForm.title} onChange={(value) => setEditForm({ ...editForm, title: value })} required />
              <Input label="Category" value={editForm.category} onChange={(value) => setEditForm({ ...editForm, category: value })} required />
              <Input label="Trigger Keywords" value={editForm.trigger_keywords} onChange={(value) => setEditForm({ ...editForm, trigger_keywords: value })} required />
              <Input label="Version" value={editForm.version} onChange={(value) => setEditForm({ ...editForm, version: value })} required />
              <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
                Content
                <textarea required value={editForm.content} onChange={(event) => setEditForm({ ...editForm, content: event.target.value })} className="min-h-28 rounded-xl border border-slate-200 p-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100" />
              </label>
              <div className="md:col-span-2">
                <button disabled={saving} className="h-11 rounded-xl bg-slate-900 px-5 font-bold text-white hover:bg-slate-800 disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}

function ProtocolCard({ protocol, match, onSelect }: { protocol: Protocol; match?: ProtocolSearchResult; onSelect: () => void }) {
  const category = protocol.category.toUpperCase();
  const tags = protocol.trigger_keywords.split(",").map((tag) => tag.trim()).filter(Boolean);
  const isCaution = category.includes("PEDIATRIC") || category.includes("FEVER");
  const border = isCaution ? "border-l-amber-500" : "border-l-red-500";
  const categoryClass = category === "RESPIRATORY" ? "bg-blue-50 text-blue-700" : category === "NEUROLOGICAL" ? "bg-violet-50 text-violet-700" : category === "TRAUMA" ? "bg-orange-50 text-orange-700" : isCaution ? "bg-cyan-50 text-cyan-700" : "bg-red-50 text-red-700";

  return (
    <article onClick={onSelect} className={`cursor-pointer rounded-2xl border border-l-4 border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${border}`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`rounded-md px-3 py-1 text-xs font-black ${categoryClass}`}>{category}</span>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
      </div>
      <h2 className="mt-5 text-lg font-black sm:text-xl">{protocol.title}</h2>
      <p className="mt-2 line-clamp-3 min-h-12 text-sm leading-6 text-slate-500 sm:text-base">{protocol.content}</p>
      {match && <p className="mt-3 text-xs font-bold text-teal-600">{titleCase(match.confidence_label)} match · {match.matched_keywords.join(", ")}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
            <Tag className="h-3 w-3" />
            {tag}
          </span>
        ))}
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
