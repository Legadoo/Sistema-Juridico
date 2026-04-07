"use client";

import { useState } from "react";

type TrackResp = {
  ok: boolean;
  message?: string;
  client?: { name: string; document: string };
  processes?: Array<{
    id: string;
    cnj: string;
    tribunal?: string | null;
    vara?: string | null;
    status: string;
    updates: Array<{ date: string; text: string }>;
  }>;
};

export default function AcompanharPage() {
  const [document, setDocument] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [data, setData] = useState<TrackResp | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setData(null);
    setLoading(true);

    const res = await fetch("/api/public/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document, code }),
    }).then(r => r.json().then(d => ({ ok: r.ok, d }))).catch(() => null);

    setLoading(false);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Não foi possível consultar.");
      return;
    }

    setData(res.d);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: 16 }}>
      <div style={{ width: 820, maxWidth: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h1 style={{ margin: 0 }}>Acompanhar Processo</h1>
          <a href="/login" style={{ fontSize: 13, color: "#333" }}>Área do escritório</a>
        </div>

        <p style={{ marginTop: 8, color: "#444" }}>
          Digite seu <b>CPF/CNPJ</b> e o <b>código</b> informado pelo escritório.
        </p>

        <form onSubmit={onSubmit} style={{ background: "white", border: "1px solid #eee", borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
          <input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="CPF ou CNPJ" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código (6 dígitos)" style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }} />

          {msg && <div style={{ background: "#fff4f4", border: "1px solid #ffd0d0", padding: 10, borderRadius: 10 }}>{msg}</div>}

          <button disabled={loading} style={{ padding: 10, borderRadius: 10, border: "1px solid #222", background: loading ? "#ddd" : "#111", color: "white" }}>
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </form>

        {data?.ok && (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={{ background: "white", border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#666" }}>Cliente</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{data.client?.name}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{data.client?.document}</div>
            </div>

            {data.processes?.map(p => (
              <div key={p.id} style={{ background: "white", border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#666" }}>CNJ</div>
                    <div style={{ fontWeight: 800 }}>{p.cnj}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{p.tribunal || ""} {p.vara ? " · " + p.vara : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#666" }}>Status</div>
                    <div style={{ fontWeight: 800 }}>{p.status}</div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Últimas atualizações</div>
                  {p.updates.length === 0 && <div style={{ color: "#666" }}>Sem atualizações visíveis no momento.</div>}
                  <div style={{ display: "grid", gap: 8 }}>
                    {p.updates.map((u, idx) => (
                      <div key={idx} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10 }}>
                        <div style={{ fontSize: 12, color: "#666" }}>{new Date(u.date).toLocaleString()}</div>
                        <div>{u.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 12, color: "#666" }}>
           (MVP) · Esta página mostra apenas informações liberadas pelo escritório.
        </div>
      </div>
    </main>
  );
}
