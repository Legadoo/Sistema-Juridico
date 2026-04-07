"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

type Role = "SUPERADMIN" | "MASTER" | "SECRETARY";

type AdminShellProps = {
  children: ReactNode;
  role: string;
  userName?: string;
};

type NavItemProps = {
  href: string;
  label: string;
  pathname: string;
};

function normalizeRole(role: string): Role {
  if (role === "SUPERADMIN" || role === "MASTER" || role === "SECRETARY") {
    return role;
  }

  return "SECRETARY";
}

function NavItem({ href, label, pathname }: NavItemProps) {
  const active =
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      style={{
        position: "relative",
        display: "block",
        padding: "14px 16px",
        borderRadius: 16,
        textDecoration: "none",
        fontWeight: 600,
        letterSpacing: "0.01em",
        transition: "all 0.22s ease",
        background: active
          ? "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(124,58,237,0.18))"
          : "rgba(255,255,255,0.03)",
        color: active ? "#F8FAFC" : "#CBD5E1",
        border: active
          ? "1px solid rgba(99,102,241,0.35)"
          : "1px solid rgba(255,255,255,0.05)",
        boxShadow: active
          ? "0 10px 30px rgba(99,102,241,0.18)"
          : "inset 0 1px 0 rgba(255,255,255,0.02)",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: active
            ? "linear-gradient(90deg, rgba(56,189,248,0.08), rgba(99,102,241,0.08), rgba(124,58,237,0.08))"
            : "transparent",
          pointerEvents: "none",
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
    </Link>
  );
}

export default function AdminShell({ children, role, userName }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const safeRole = normalizeRole(role);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.08), transparent 22%), radial-gradient(circle at top right, rgba(124,58,237,0.10), transparent 26%), linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
        color: "#F8FAFC",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          opacity: 0.18,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "290px 1fr",
          minHeight: "100vh",
        }}
      >
        <aside
          style={{
            position: "relative",
            padding: 20,
            borderRight: "1px solid rgba(255,255,255,0.06)",
            background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(2,6,23,0.94))",
            backdropFilter: "blur(18px)",
            boxShadow: "0 0 40px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                padding: 18,
                borderRadius: 22,
                background: "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(56,189,248,0.08))",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  fontSize: 12,
                  color: "#BFDBFE",
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#38BDF8",
                    boxShadow: "0 0 12px rgba(56,189,248,0.9)",
                  }}
                />
                JURIDICVAS
              </div>

              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "#F8FAFC" }}>
                Painel Premium
              </div>

              <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 8, lineHeight: 1.6 }}>
                Gestão jurídica moderna, confortável aos olhos e pronta para longas jornadas de uso.
              </div>

              {userName ? (
                <div
                  style={{
                    marginTop: 16,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: "#E2E8F0",
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, #6366F1, #7C3AED)",
                      boxShadow: "0 8px 20px rgba(99,102,241,0.35)",
                      fontWeight: 800,
                    }}
                  >
                    {userName.charAt(0).toUpperCase()}
                  </span>
                  <span>
                    Olá, <strong>{userName}</strong>
                  </span>
                </div>
              ) : null}
            </div>

            <nav style={{ display: "grid", gap: 10 }}>
              <NavItem href="/admin" label="Dashboard" pathname={pathname} />
              <NavItem href="/admin/clients" label="Clientes" pathname={pathname} />
              <NavItem href="/admin/clients/archived" label="Clientes Arquivados" pathname={pathname} />
              <NavItem href="/admin/processes" label="Processos" pathname={pathname} />
              <NavItem href="/admin/processes/archived" label="Processos Arquivados" pathname={pathname} />
              <NavItem href="/admin/deadlines" label="Prazos" pathname={pathname} />

              {(safeRole === "MASTER" || safeRole === "SUPERADMIN") && (
                <NavItem href="/admin/users" label="Usuários" pathname={pathname} />
              )}

              {safeRole === "SUPERADMIN" && (
                <NavItem href="/admin/settings" label="Configurações" pathname={pathname} />
              )}

              <NavItem href="/acompanhar" label="Página do Cliente" pathname={pathname} />
            </nav>
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 16,
                border: "1px solid rgba(239,68,68,0.28)",
                background: "linear-gradient(135deg, rgba(127,29,29,0.35), rgba(239,68,68,0.16))",
                color: "#FCA5A5",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
              }}
            >
              Encerrar sessão
            </button>
          </div>
        </aside>

        <main
          style={{
            position: "relative",
            padding: 28,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.22), transparent 68%)",
              filter: "blur(24px)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 40,
              left: 40,
              width: 260,
              height: 260,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56,189,248,0.10), transparent 70%)",
              filter: "blur(24px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
