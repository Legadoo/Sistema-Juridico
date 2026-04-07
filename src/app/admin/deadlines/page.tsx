"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";

type Me = { name: string; role: string };
type Client = { name: string; document: string };
type Proc = { id: string; cnj: string; notes?: string | null; client: Client };
type Deadline = { id: string; title: string; dueDate: string; done: boolean; process: Proc };

export default function DeadlinesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [processes, setProcesses] = useState<Proc[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [processId, setProcessId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const m = await fetch("/api/me").then(r => r.json()).catch(() => null);
    if (m?.ok) setMe({ name: m.user.name, role: m.user.role });

    const p = await fetch("/api/admin/processes").then(r => r.json()).catch(() => null);
    if (p?.ok) setProcesses(p.processes || []);

    const d = await fetch("/api/admin/deadlines?days=365&pending=1").then(r => r.json()).catch(() => null);
    if (d?.ok) setDeadlines(d.deadlines || []);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const res = await fetch("/api/admin/deadlines", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ processId, title, dueDate }),
    }).then(r => r.json()).catch(() => null);

    if (!res?.ok) {
      setMsg(res?.message || "Erro ao criar prazo.");
      return;
    }

    setTitle("");
    setDueDate("");
    await load();
  }

  async function toggleDone(id: string, done: boolean) {
    await fetch("/api/admin/deadlines/done", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, done }),
    }).catch(() => null);

    await load();
  }

  function fmt(iso: string) {
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  }

  if (!me) return <div style={{ padding: 16 }}>Carregando...</div>;

  return (
    <AdminShell userName={me.name} role={me.role}>
      <h1 style={{ marginTop: 0 }}>Prazos</h1>

      <form onSubmit={create} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Cadastrar prazo</div>

        <select value={processId} onChange={(e) => setProcessId(e.target.value)} style={{ padding: 10 }}>
          <option value="">Selecione o processo</option>
          {processes.map(p => (
            <option key={p.id} value={p.id}>
              {p.client.name} ({p.client.document}) — {p.cnj}
            </option>
          ))}
        </select>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descrição (ex: prazo de contestação)" style={{ padding: 10 }} />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ padding: 10 }} />

        {msg && <div style={{ background: "#fff4f4", border: "1px solid #ffd0d0", padding: 10, borderRadius: 10 }}>{msg}</div>}

        <button style={{ padding: 10, borderRadius: 12, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 900 }}>
          Salvar prazo
        </button>
      </form>

      <div style={{ marginTop: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Prazos pendentes</div>

        {deadlines.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Nenhum prazo pendente.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {deadlines.map(d => (
              <div key={d.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Vence: {fmt(d.dueDate)} — {d.process.client.name} — CNJ {d.process.cnj}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleDone(d.id, true)}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900, cursor: "pointer" }}
                >
                  Concluir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
