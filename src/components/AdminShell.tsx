"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AdminShellProps = {
  userName: string;
  role: string;
  firmName?: string;
  children: React.ReactNode;
};

type NavItemProps = {
  href: string;
  label: string;
  pathname: string;
  onNavigate?: () => void;
};

type MeResponse = {
  ok?: boolean;
  suggestedRedirect?: string;
  user?: {
    canAccessAdmin?: boolean;
    onboardingStatus?: string;
    role?: string;
    firmId?: string | null;
  } | null;
  firm?: {
    name?: string;
  } | null;
  firmConfig?: {
    moduleDashboard?: boolean;
    moduleClients?: boolean;
    moduleProcesses?: boolean;
    moduleDeadlines?: boolean;
    moduleAppointments?: boolean;
    moduleAvailability?: boolean;
    moduleUsers?: boolean;
    moduleCharges?: boolean;
  } | null;
};

function roleLabel(role: string) {
  if (role === "MASTER") return "Advogado";
  if (role === "SECRETARY") return "Estagiário";
  if (role === "SUPERADMIN") return "Super Admin";
  return role;
}

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;

  if (href === "/admin/processes") {
    return (
      pathname === href ||
      (pathname.startsWith(href + "/") &&
        !pathname.startsWith("/admin/processes/archived"))
    );
  }

  if (href === "/admin/clients") {
    return (
      pathname === href ||
      (pathname.startsWith(href + "/") &&
        !pathname.startsWith("/admin/clients/archived"))
    );
  }

  return pathname === href || pathname.startsWith(href + "/");
}

function NavItem({ href, label, pathname, onNavigate }: NavItemProps) {
  const active = isItemActive(pathname, href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={[
        "group flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
        active
          ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30 shadow-[0_0_0_1px_rgba(139,92,246,0.08)]"
          : "text-zinc-300 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function AdminShell({
  userName,
  role,
  firmName,
  children,
}: AdminShellProps) {
  const pathname = usePathname();

  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resolvedFirmName, setResolvedFirmName] = useState(firmName || "Advocacia");
  const [firmModules, setFirmModules] = useState({
    moduleDashboard: true,
    moduleClients: true,
    moduleProcesses: true,
    moduleDeadlines: true,
    moduleAppointments: true,
    moduleAvailability: true,
    moduleUsers: true,
    moduleCharges: true,
  });

  useEffect(() => {
  let ignore = false;

  async function loadFirm() {
    try {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as MeResponse | null;

      if (!ignore && response.ok && data?.ok) {
        const canAccessAdmin = data.user?.canAccessAdmin;
        const suggestedRedirect = data.suggestedRedirect || "/";

        if (role !== "SUPERADMIN" && !canAccessAdmin) {
          window.location.href = suggestedRedirect;
          return;
        }

        setResolvedFirmName(data.firm?.name || firmName || "Advocacia");

        if (data.firmConfig) {
          setFirmModules({
            moduleDashboard: data.firmConfig.moduleDashboard ?? true,
            moduleClients: data.firmConfig.moduleClients ?? true,
            moduleProcesses: data.firmConfig.moduleProcesses ?? true,
            moduleDeadlines: data.firmConfig.moduleDeadlines ?? true,
            moduleAppointments: data.firmConfig.moduleAppointments ?? true,
            moduleAvailability: data.firmConfig.moduleAvailability ?? true,
            moduleUsers: data.firmConfig.moduleUsers ?? true,
            moduleCharges: data.firmConfig.moduleCharges ?? true,
          });

          const routeBlocked =
            (pathname === "/admin" && !(data.firmConfig.moduleDashboard ?? true)) ||
            (pathname.startsWith("/admin/clients") && !(data.firmConfig.moduleClients ?? true)) ||
            (pathname.startsWith("/admin/processes") && !(data.firmConfig.moduleProcesses ?? true)) ||
            (pathname.startsWith("/admin/deadlines") && !(data.firmConfig.moduleDeadlines ?? true)) ||
            (pathname.startsWith("/admin/appointments") && !(data.firmConfig.moduleAppointments ?? true)) ||
            (pathname.startsWith("/admin/availability") && !(data.firmConfig.moduleAvailability ?? true)) ||
            (pathname.startsWith("/admin/users") && !(data.firmConfig.moduleUsers ?? true)) ||
            (pathname.startsWith("/admin/charges") && !(data.firmConfig.moduleCharges ?? true));

          if (role !== "SUPERADMIN" && routeBlocked) {
            window.location.href = "/admin";
            return;
          }
        }

        return;
      }

      if (!ignore) {
        window.location.href = "/login";
      }
    } catch {
      if (!ignore) {
        window.location.href = "/login";
      }
    }
  }

  void loadFirm();

  return () => {
    ignore = true;
  };
}, [firmName, role, pathname]);

  async function logout() {
    if (loading) return;

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      // Segue para o login mesmo se a chamada falhar.
    }

    window.location.href = "/login";
  }

  const navItems = [
  ...(role === "SUPERADMIN" || firmModules.moduleDashboard
    ? [{ href: "/admin", label: "Dashboard" }]
    : []),
  ...(role === "SUPERADMIN" || firmModules.moduleClients
    ? [
        { href: "/admin/clients", label: "Clientes" },
        { href: "/admin/clients/archived", label: "Clientes arquivados" },
      ]
    : []),
  ...(role === "SUPERADMIN" || firmModules.moduleProcesses
    ? [
        { href: "/admin/processes", label: "Processos" },
        { href: "/admin/processes/archived", label: "Processos arquivados" },
      ]
    : []),
  ...(role === "SUPERADMIN" || firmModules.moduleDeadlines
    ? [{ href: "/admin/deadlines", label: "Prazos" }]
    : []),
  ...(role === "SUPERADMIN" || firmModules.moduleAppointments
    ? [{ href: "/admin/appointments", label: "Agendamentos" }]
    : []),
  ...(role === "SUPERADMIN" || firmModules.moduleAvailability
    ? [{ href: "/admin/availability", label: "Abertura de agenda" }]
    : []),
  ...(role === "SUPERADMIN" || firmModules.moduleUsers
    ? [{ href: "/admin/users", label: "Usuários" }]
    : []),
  ...(role === "SUPERADMIN" || firmModules.moduleCharges
    ? [{ href: "/admin/charges", label: "Cobranças" }]
    : []),
];

  if (role === "SUPERADMIN") {
    navItems.push({ href: "/admin/settings", label: "Configurações" });
    navItems.push({ href: "/admin/super/site", label: "Site público" });
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <div className="flex min-h-screen">
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside
          className={[
            "fixed inset-y-0 left-0 z-50 w-[290px] border-r border-white/10 bg-[#0b0b10]/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-5 py-6">
              <div className="flex items-start justify-between gap-3 lg:block">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-300/80">
                    JuridicVas
                  </div>

                  <h1 className="mt-2 text-2xl font-bold text-white">
                    Painel Admin
                  </h1>

                  <p className="mt-2 text-sm font-medium text-zinc-200">
                    {resolvedFirmName}
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    {userName} - {roleLabel(role)}
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 lg:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  X
                </button>
              </div>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
              {navItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  pathname={pathname}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              ))}
            </nav>

            <div className="border-t border-white/10 p-4">
              <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Sessão ativa
                </div>
                <div className="mt-2 text-sm font-medium text-zinc-200">
                  {userName}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  {roleLabel(role)}
                </div>
                <div className="mt-2 text-xs text-violet-300">
                  {resolvedFirmName}
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                disabled={loading}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saindo..." : "Sair"}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090b]/85 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-300/80">
                  JuridicVas
                </div>
                <div className="truncate text-sm font-medium text-zinc-200">
                  {userName}
                </div>
                <div className="truncate text-xs text-violet-300">
                  {resolvedFirmName}
                </div>
              </div>

              <button
                type="button"
                aria-label="Abrir menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg text-white"
                onClick={() => setMobileMenuOpen(true)}
              >
                ☰
              </button>
            </div>
          </header>

          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[1700px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
