"use client";

import {
  Activity,
  Bell,
  BookOpen,
  ClipboardList,
  Download,
  Grid2X2,
  Search,
  Shield,
  Stethoscope,
  UserCog,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ElementType, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  API_URL,
  apiFetch,
  formatDateTime,
  getToken,
  titleCase,
  type BackendStatus,
  type GlobalSearchResults,
  type OperationAlert,
  type User,
} from "@/lib/api";

const navItems = [
  { label: "Dashboard", icon: Grid2X2, href: "/dashboard", section: "dashboard" },
  { label: "Patients", icon: UsersRound, href: "/patients", section: "patients" },
  { label: "Triage", icon: Stethoscope, href: "/triage", section: "triage" },
  { label: "Protocols", icon: BookOpen, href: "/protocols", section: "protocols" },
  { label: "Audit Log", icon: ClipboardList, href: "/audit", section: "audit", roles: ["admin", "coordinator"] },
  { label: "Exports", icon: Download, href: "/exports", section: "exports" },
  { label: "Staff", icon: UserCog, href: "/staff", section: "staff", roles: ["admin", "coordinator"] },
];

export type DashboardSection =
  | "dashboard"
  | "patients"
  | "triage"
  | "protocols"
  | "audit"
  | "exports"
  | "staff";

export function DashboardShell({
  active,
  children,
}: {
  active: DashboardSection;
  children: ReactNode;
}) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<OperationAlert[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadShellData() {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const [userData, statusResponse] = await Promise.all([
          apiFetch<User>("/auth/me"),
          fetch(`${API_URL}/status`).then((response) => response.json() as Promise<BackendStatus>),
        ]);
        if (mounted) {
          setCurrentUser(userData);
          setStatus(statusResponse);
          apiFetch<OperationAlert[]>("/operations/alerts")
            .then((items) => mounted && setAlerts(items))
            .catch(() => mounted && setAlerts([]));
        }
      } catch {
        if (mounted) {
          localStorage.removeItem("access_token");
          router.replace("/login");
        }
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    }

    loadShellData();
    return () => {
      mounted = false;
    };
  }, [router]);

  const initials = useMemo(() => {
    if (!currentUser?.full_name) return "ZS";
    return currentUser.full_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [currentUser]);

  function signOut() {
    localStorage.removeItem("access_token");
    router.replace("/login");
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError("");
    setPasswordMessage("");

    try {
      const result = await apiFetch<{ message: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage(result.message);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Unable to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  function openPasswordDialog() {
    setAccountOpen(false);
    setPasswordError("");
    setPasswordMessage("");
    setCurrentPassword("");
    setNewPassword("");
    setPasswordOpen(true);
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      apiFetch<GlobalSearchResults>(`/operations/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        signal: controller.signal,
      })
        .then(setSearchResults)
        .catch(() => setSearchResults(null));
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const visibleNavItems = navItems.filter((item) => {
    if (!("roles" in item) || !item.roles) return true;
    return currentUser ? item.roles.includes(currentUser.role) : false;
  });

  if (checkingAuth) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 font-semibold shadow-sm">
          Checking session...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-slate-50 text-slate-950">
      <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-800 bg-slate-950 text-slate-400 lg:flex lg:flex-col">
          <div className="flex h-[5.5rem] items-center gap-3 border-b border-slate-800 px-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-400">
              <Shield className="h-7 w-7" />
            </div>
            <p className="text-xl font-black text-white">
              Blackout<span className="text-teal-400">Care</span>
            </p>
          </div>

          <div className="px-6 py-7">
            <div className="rounded-xl bg-slate-800/80 p-4">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-100">
                <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.18)]" />
                Downtime Mode Active
              </div>
              <p className="mt-2 text-sm text-slate-400">Local-first operations enabled</p>
            </div>
          </div>

          <nav className="grid gap-2 px-5">
            {visibleNavItems.map((item) => (
              <NavItem key={item.section} {...item} active={item.section === active} />
            ))}
          </nav>

          <div className="mt-auto border-t border-slate-800 px-7 py-6">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Activity className="h-5 w-5" />
              <span>v1.0 - Offline Copilot</span>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-20 flex-col gap-4 px-4 py-4 sm:px-6 lg:h-[5.5rem] lg:flex-row lg:items-center lg:justify-between lg:px-8 xl:px-10">
              <div className="flex items-center justify-between gap-4 lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                    <Shield className="h-6 w-6" />
                  </div>
                  <p className="text-lg font-black">
                    Blackout<span className="text-teal-600">Care</span>
                  </p>
                </div>
                <StatusPill status={status} />
              </div>

              <div className="relative w-full max-w-md lg:max-w-sm xl:max-w-md">
                <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-slate-500">
                  <Search className="h-5 w-5 shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500 sm:text-base"
                    placeholder="Search patients, cases, protocols..."
                  />
                </div>
                {searchResults && (
                  <div className="absolute left-0 right-0 top-14 z-40 max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                    <SearchGroup title="Patients" items={searchResults.patients} clear={() => setSearchQuery("")} />
                    <SearchGroup title="Cases" items={searchResults.triage_cases} clear={() => setSearchQuery("")} />
                    <SearchGroup title="Protocols" items={searchResults.protocols} clear={() => setSearchQuery("")} />
                    <SearchGroup title="Incidents" items={searchResults.incidents} clear={() => setSearchQuery("")} />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 lg:justify-end">
                <div className="hidden lg:block">
                  <StatusPill status={status} />
                </div>
                <button
                  onClick={() => setAlertsOpen((value) => !value)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {alerts.length > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
                </button>
                {alertsOpen && (
                  <div className="absolute right-20 top-20 z-40 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="font-bold">Alerts</p>
                      <p className="text-sm text-slate-500">{alerts.length} active signals</p>
                    </div>
                    <div className="max-h-96 overflow-auto">
                      {alerts.map((alert, index) => (
                        <Link key={`${alert.type}-${index}`} href={alert.href} onClick={() => setAlertsOpen(false)} className="block border-b border-slate-100 px-4 py-3 hover:bg-slate-50">
                          <p className={`text-sm font-bold ${alert.severity === "critical" ? "text-red-700" : alert.severity === "warning" ? "text-amber-700" : "text-slate-800"}`}>
                            {alert.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{alert.description}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDateTime(alert.created_at)}</p>
                        </Link>
                      ))}
                      {alerts.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No active alerts.</p>}
                    </div>
                  </div>
                )}
                <div className="h-8 w-px bg-slate-200" />
                <div className="relative">
                  <button
                    onClick={() => setAccountOpen((value) => !value)}
                    className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-slate-100"
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">
                      {initials}
                    </div>
                    <div className="hidden sm:block">
                      <p className="font-bold leading-tight">{currentUser?.full_name || "Clinical Staff"}</p>
                      <p className="text-sm text-slate-500">{currentUser?.role || "authenticated"}</p>
                    </div>
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 top-14 z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" role="menu">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="font-bold">{currentUser?.full_name || "Clinical Staff"}</p>
                        <p className="text-sm text-slate-500">{currentUser?.staff_code}</p>
                      </div>
                      <button
                        onClick={openPasswordDialog}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                        role="menuitem"
                      >
                        Change password
                      </button>
                      <button
                        onClick={signOut}
                        className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {visibleNavItems.map((item) => (
                  <MobileNavItem key={item.section} {...item} active={item.section === active} />
                ))}
              </nav>
            </div>
          </header>

          {children}
        </section>
      </div>

      {passwordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/20 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black">Change Password</h2>
                <p className="mt-1 text-sm text-slate-500">Update your local BlackoutCare password.</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Close change password"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={changePassword} className="mt-5 space-y-4">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Current Password
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 px-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                New Password
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 px-3 font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
              </label>

              {passwordError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {passwordError}
                </div>
              )}
              {passwordMessage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {passwordMessage}
                </div>
              )}

              <button
                disabled={passwordSaving}
                className="h-12 w-full rounded-xl bg-teal-600 font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {passwordSaving ? "Saving..." : "Save Password"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: BackendStatus | null }) {
  const online = status?.api === "ok" && status?.database === "ok" && status?.ollama === "ok";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      <Wifi className="h-4 w-4" />
      {online ? "System Online" : status?.ollama === "model_missing" ? "AI Model Missing" : "System Degraded"}
    </div>
  );
}

function SearchGroup({
  title,
  items,
  clear,
}: {
  title: string;
  items: { id: number; label: string; description: string | null; href: string }[];
  clear: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-b border-slate-100 py-2">
      <p className="px-4 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{title}</p>
      {items.map((item) => (
        <Link key={`${title}-${item.id}`} href={item.href} onClick={clear} className="block px-4 py-2 hover:bg-slate-50">
          <p className="text-sm font-bold text-slate-900">{item.label}</p>
          {item.description && <p className="mt-0.5 truncate text-xs text-slate-500">{item.description}</p>}
        </Link>
      ))}
    </div>
  );
}

function NavItem({
  label,
  icon: Icon,
  href,
  active,
}: {
  label: string;
  icon: ElementType;
  href: string;
  section: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex h-14 items-center justify-between rounded-xl px-4 text-left text-base font-semibold transition ${
        active
          ? "bg-teal-500/15 text-teal-300"
          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
      }`}
    >
      <span className="flex items-center gap-4">
        <Icon className="h-5 w-5" />
        {label}
      </span>
      {active && <span className="h-2 w-2 rounded-full bg-teal-300" />}
    </Link>
  );
}

function MobileNavItem({
  label,
  icon: Icon,
  href,
  active,
}: {
  label: string;
  icon: ElementType;
  href: string;
  section: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
        active
          ? "bg-teal-50 text-teal-700"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
