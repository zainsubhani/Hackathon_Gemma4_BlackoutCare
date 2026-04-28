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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ElementType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch, getToken, type BackendStatus, type User } from "@/lib/api";

const navItems = [
  { label: "Dashboard", icon: Grid2X2, href: "/dashboard", section: "dashboard" },
  { label: "Patients", icon: UsersRound, href: "/patients", section: "patients" },
  { label: "Triage", icon: Stethoscope, href: "/triage", section: "triage" },
  { label: "Protocols", icon: BookOpen, href: "/protocols", section: "protocols" },
  { label: "Audit Log", icon: ClipboardList, href: "/audit", section: "audit" },
  { label: "Exports", icon: Download, href: "/exports", section: "exports" },
  { label: "Staff", icon: UserCog, href: "/staff", section: "staff" },
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
              Care<span className="text-teal-400">Continuum</span>
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
            {navItems.map((item) => (
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
                    Care<span className="text-teal-600">Continuum</span>
                  </p>
                </div>
                <StatusPill status={status} />
              </div>

              <div className="flex w-full max-w-md items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-slate-500 lg:max-w-sm xl:max-w-md">
                <Search className="h-5 w-5 shrink-0" />
                <span className="truncate text-sm sm:text-base">Search patients, cases, protocols...</span>
              </div>

              <div className="flex items-center justify-between gap-4 lg:justify-end">
                <div className="hidden lg:block">
                  <StatusPill status={status} />
                </div>
                <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                </button>
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
                        onClick={signOut}
                        className="w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                        role="menuitem"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {navItems.map((item) => (
                  <MobileNavItem key={item.section} {...item} active={item.section === active} />
                ))}
              </nav>
            </div>
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: BackendStatus | null }) {
  const online = status?.api === "ok" && status?.database === "ok";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      <Wifi className="h-4 w-4" />
      {online ? "System Online" : "System Degraded"}
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
