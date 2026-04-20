"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";

  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setMsg(data?.message || "Não foi possível entrar.");
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setMsg("Erro ao tentar entrar.");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div style={{ width: 420, maxWidth: "100%", background: "white", borderRadius: 14, padding: 18, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>juridicVas</h1>
          <span style={{ fontSize: 12, color: "#666" }}></span>
        </div>

        <p style={{ marginTop: 8, marginBottom: 16, color: "#444" }}>
          Entre com sua conta (Advogado Master ou Secretária).
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#333" }}>E-mail</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="seuemail@dominio.com"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#333" }}>Senha</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="********"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd" }}
            />
          </label>

          {msg && (
            <div style={{ background: "#fff4f4", border: "1px solid #ffd0d0", color: "#8a1f1f", padding: 10, borderRadius: 10, fontSize: 13 }}>
              {msg}
            </div>
          )}

          <button
            disabled={loading}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #222",
              background: loading ? "#ddd" : "#111",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div style={{ fontSize: 12, color: "#666", marginTop: 6, lineHeight: 1.4 }}>
            Demo Master: <b>admin@demo.com</b> / <b>admin123</b>
          </div>
        </form>
      </div>
    </main>
  );
}
