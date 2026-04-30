"use client";

import { Plus, Search, UserCog } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DashboardShell } from "@/components/DashboardShell";
import { apiFetch, formatDateTime, titleCase, type User } from "@/lib/api";

const roles = ["doctor", "nurse", "admin", "coordinator"] as const;

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    role: "doctor",
    department: "",
    staff_code: "",
    password: "",
  });
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "doctor",
    department: "",
    staff_code: "",
    password: "",
  });

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.full_name, user.staff_code, user.department || "", user.role].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [search, users]);

  async function loadUsers(nextRole = role) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (nextRole) params.set("role", nextRole);
      setUsers(await apiFetch<User[]>(`/users/?${params}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load staff users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialUsers() {
      try {
        const data = await apiFetch<User[]>("/users/?limit=500");
        if (active) setUsers(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load staff users");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialUsers();
    return () => {
      active = false;
    };
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiFetch<User>("/users/", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name,
          role: form.role,
          department: form.department || null,
          staff_code: form.staff_code,
          password: form.password,
        }),
      });
      setShowCreate(false);
      setForm({ full_name: "", role: "doctor", department: "", staff_code: "", password: "" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create staff user");
    } finally {
      setSaving(false);
    }
  }

  function selectUser(user: User) {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name,
      role: user.role,
      department: user.department || "",
      staff_code: user.staff_code,
      password: "",
    });
  }

  async function updateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string | null> = {
        full_name: editForm.full_name,
        role: editForm.role,
        department: editForm.department || null,
        staff_code: editForm.staff_code,
      };
      if (editForm.password) payload.password = editForm.password;

      const updated = await apiFetch<User>(`/users/${selectedUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setSelectedUser(updated);
      setEditForm({ ...editForm, password: "" });
      setUsers((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update staff user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell active="staff">
      <div className="mx-auto max-w-[100rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Staff Admin</h1>
            <p className="mt-2 text-base text-slate-500 sm:text-lg">
              Manage clinical users and role access
            </p>
          </div>

          <button
            onClick={() => setShowCreate((value) => !value)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 font-bold text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700"
          >
            <Plus className="h-5 w-5" />
            Add Staff
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {showCreate && (
          <form onSubmit={createUser} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-3">
            <Input label="Full Name" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} required />
            <Select label="Role" value={form.role} onChange={(value) => setForm({ ...form, role: value })} options={[...roles]} />
            <Input label="Department" value={form.department} onChange={(value) => setForm({ ...form, department: value })} />
            <Input label="Staff Code" value={form.staff_code} onChange={(value) => setForm({ ...form, staff_code: value.toUpperCase() })} required />
            <Input label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} required />
            <div className="flex items-end">
              <button disabled={saving} className="h-11 w-full rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving ? "Saving..." : "Create Staff"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-500 shadow-sm">
            <Search className="h-5 w-5 shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
              placeholder="Search by name, code, role..."
            />
          </div>
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              loadUsers(event.target.value);
            }}
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none"
          >
            <option value="">All Roles</option>
            {roles.map((item) => (
              <option key={item} value={item}>{titleCase(item)}</option>
            ))}
          </select>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left">
              <thead className="bg-slate-50 text-sm font-black uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Staff</th>
                  <th className="px-5 py-4">Code</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((user) => (
                  <tr key={user.id} onClick={() => selectUser(user)} className="cursor-pointer transition hover:bg-slate-50/80">
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                          <UserCog className="h-5 w-5" />
                        </div>
                        <span className="font-bold">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-5 font-mono text-sm font-bold">{user.staff_code}</td>
                    <td className="px-5 py-5">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                        {titleCase(user.role)}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-slate-500">{user.department || "-"}</td>
                    <td className="px-5 py-5 text-slate-500">{formatDateTime(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && visibleUsers.length === 0 && (
              <div className="px-5 py-10 text-center text-slate-500">No staff users found.</div>
            )}
            {loading && <div className="px-5 py-10 text-center text-slate-500">Loading staff users...</div>}
          </div>
        </section>

        {selectedUser && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">{selectedUser.full_name}</h2>
                <p className="mt-1 font-mono text-sm text-slate-500">{selectedUser.staff_code}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <form onSubmit={updateUser} className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
              <Input label="Full Name" value={editForm.full_name} onChange={(value) => setEditForm({ ...editForm, full_name: value })} required />
              <Select label="Role" value={editForm.role} onChange={(value) => setEditForm({ ...editForm, role: value })} options={[...roles]} />
              <Input label="Department" value={editForm.department} onChange={(value) => setEditForm({ ...editForm, department: value })} />
              <Input label="Staff Code" value={editForm.staff_code} onChange={(value) => setEditForm({ ...editForm, staff_code: value.toUpperCase() })} required />
              <Input label="New Password" type="password" value={editForm.password} onChange={(value) => setEditForm({ ...editForm, password: value })} />
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

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 px-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      />
    </label>
  );
}

function Select({
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
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 px-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {titleCase(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
