"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export function AdminShell({ userName, role, children }: { userName: string; role: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  

  const roleLabel = (r: string) => {
    if (r === "MASTER") return "Advogado";
    if (r === "SECRETARY") return "Estagiário";
    if (r === "SUPERADMIN") return "Super Admin";
    return r;
  };async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  const Item = ({ href, label }: { href: string; label: string }) => {
    const active =
      href === "/admin"
        ? pathname === href
        :  href === "/admin/processes"
          ? (pathname === href || (pathname.startsWith(href + "/") && !pathname.startsWith("/admin/processes/archived")))
          : href === "/admin/clients"
            ? (pathname === href || (pathname.startsWith(href + "/") && !pathname.startsWith("/admin/clients/archived")))
          : (pathname === href || pathname.startsWith(href + "/"));
    return (
      <Link
        href={href}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          textDecoration: "none",
          color: active ? "white" : "#222",
          background: active ? "#111" : "transparent",
          border: "1px solid " + (active ? "#111" : "transparent"),
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <aside style={{ background: "white", borderRight: "1px solid #eee", padding: 14 }}>
        <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>juridicVas</div>
            <span style={{ fontSize: 12, color: "#666" }}>Admin</span>
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {userName} · <b>{roleLabel(role)}</b>
          </div>
        </div>

        <nav style={{ display: "grid", gap: 6 }}>
          <Item href="/admin" label="Dashboard" />
          <Item href="/admin/clients" label="Clientes" />
                    <Item href="/admin/clients/archived" label="Clientes arquivados" />
<Item href="/admin/processes" label="Processos" />
          <Item href="/admin/processes/archived" label="Processos arquivados" />
          {(role === "MASTER" || role === "SUPERADMIN") && <Item href="/admin/users" label="Usuários" />}
          <Item href="/acompanhar" label="Página do Cliente" />
        </nav>

        <button
          onClick={logout}
          disabled={loading}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: loading ? "#eee" : "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Saindo..." : "Sair"}
        </button>
      </aside>

      <main style={{ padding: 16 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}








