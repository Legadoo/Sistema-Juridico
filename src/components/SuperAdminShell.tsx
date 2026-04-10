"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type SuperAdminShellProps = {
  userName: string;
  children: React.ReactNode;
};

type NavItemProps = {
  href: string;
  label: string;
  pathname: string;
  onNavigate?: () => void;
};

function isItemActive(pathname: string, href: string) {
  if (href === "/admin/super") return pathname === href;
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
          ? "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
          : "text-zinc-300 hover:bg-white/5 hover:text-white",
      ].join(" ")}
    >
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function SuperAdminShell({ userName, children }: SuperAdminShellProps) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function logout() {
    if (loading) return;

    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });
    } catch {
      // segue para login mesmo assim
    }

    window.location.href = "/login";
  }

  const navItems = [
    { href: "/admin/super", label: "Dashboard SaaS" },
    { href: "/admin/super/firms", label: "Advocacias" },
  ];

  return (
    <div className="min-h-screen bg-[#05070d] text-white">
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
            "fixed inset-y-0 left-0 z-50 w-[310px] border-r border-cyan-400/10 bg-[#060912]/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-cyan-400/10 px-5 py-6">
              <div className="flex items-start justify-between gap-3 lg:block">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
                    JuridicVas
                  </div>

                  <h1 className="mt-2 text-2xl font-bold text-white">
                    Console SaaS
                  </h1>

                  <p className="mt-2 text-sm font-medium text-zinc-200">
                    Plataforma global
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    {userName} - Super Admin
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

            <div className="border-t border-cyan-400/10 p-4">
              <div className="mb-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04] px-4 py-3">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Sessão ativa
                </div>
                <div className="mt-2 text-sm font-medium text-zinc-200">
                  {userName}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  Super Admin
                </div>
                <div className="mt-2 text-xs text-cyan-300">
                  Controle global da plataforma
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
          <header className="sticky top-0 z-30 border-b border-cyan-400/10 bg-[#090c14]/85 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  JuridicVas
                </div>
                <div className="truncate text-sm font-medium text-zinc-200">
                  {userName}
                </div>
                <div className="truncate text-xs text-cyan-300">
                  Console SaaS
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
            <div className="mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}