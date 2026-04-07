"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";

type Me = { id: string; name: string; role: string };
type Client = { id: string; name: string; document: string };

type Proc = {
  id: string;
  title: string;
  cnj?: string | null;
  number?: string | null;
  clientId: string;
  archived: boolean;
  createdAt: string;
  client: Client;
};

type UpdateItem = {
  id: string;
  text?: string;
  message?: string;
  content?: string;
  visibleToClient?: boolean;
  isPublic?: boolean;
  createdAt: string;
};

type DeadlineItem = {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
  createdAt?: string;
};

export default function ProcessesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<Proc[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // criar processo
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [cnj, setCnj] = useState("");

  // updates por processo
  const [openProcId, setOpenProcId] = useState<string | null>(null);
  const [updatesByProc, setUpdatesByProc] = useState<Record<string, UpdateItem[]>>({});
  const [draftByProc, setDraftByProc] = useState<Record<string, string>>({});
  const [visibleByProc, setVisibleByProc] = useState<Record<string, boolean>>({});
  const [savingByProc, setSavingByProc] = useState<Record<string, boolean>>({});

  // prazos por processo
  const [openDeadlineProcId, setOpenDeadlineProcId] = useState<string | null>(null);
  const [deadlinesByProc, setDeadlinesByProc] = useState<Record<string, DeadlineItem[]>>({});
  const [deadlineTitleByProc, setDeadlineTitleByProc] = useState<Record<string, string>>({});
  const [deadlineDateByProc, setDeadlineDateByProc] = useState<Record<string, string>>({});
  const [savingDeadlineByProc, setSavingDeadlineByProc] = useState<Record<string, boolean>>({});

  const isSuper = me?.role === "SUPERADMIN";

  async function load() {
    const m = await fetch("/api/me").then(r => r.json()).catch(() => null);
    if (!m?.ok) return;
    setMe({ id: m.user.id, name: m.user.name, role: m.user.role });

    const c = await fetch("/api/admin/clients").then(r => r.json()).catch(() => null);
    if (c?.ok) setClients(c.clients);

    const p = await fetch("/api/admin/processes").then(r => r.json()).catch(() => null);
    if (p?.ok) setProcesses((p.processes || []).filter((x: any) => !x.archived));
  }

  useEffect(() => { load(); }, []);

  async function createProcess(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const cleanClient = (clientId || "").trim();
    const cleanCnj = (cnj || "").trim();
    const cleanTitle = (title || "").trim();

    if (!cleanClient || !cleanCnj) {
      setMsg("Preencha CNJ e Cliente.");
      return;
    }

    const payload: any = {
      clientId: cleanClient,
      cnj: cleanCnj,
      number: cleanCnj,
      processNumber: cleanCnj,
      title: cleanTitle || "Processo",
    };

    const res = await fetch("/api/admin/processes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) })).catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao criar processo.");
      return;
    }

    setTitle("");
    setCnj("");
    await load();
  }

  async function archiveProcess(processId: string) {
    if (!confirm("Arquivar este processo?")) return;

    await fetch("/api/admin/processes/archive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ processId }),
    }).catch(() => null);

    if (openProcId === processId) setOpenProcId(null);
    if (openDeadlineProcId === processId) setOpenDeadlineProcId(null);
    await load();
  }

  async function deleteProcess(processId: string) {
    if (!isSuper) return;

    const ok = confirm("EXCLUIR processo PERMANENTEMENTE? Isso apaga de vez.");
    if (!ok) return;

    const res = await fetch("/api/admin/processes/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ processId }),
    }).then(r => r.json()).catch(() => null);

    if (!res?.ok) {
      alert(res?.message || "Erro ao excluir.");
      return;
    }

    if (openProcId === processId) setOpenProcId(null);
    if (openDeadlineProcId === processId) setOpenDeadlineProcId(null);
    await load();
  }

  async function loadUpdates(processId: string) {
    const res = await fetch(`/api/admin/processes/${processId}/updates`)
      .then(r => r.json())
      .catch(() => null);

    if (!res?.ok) return;

    const list = res.updates || res.items || res.data || [];
    setUpdatesByProc(prev => ({ ...prev, [processId]: list }));
  }

  async function toggleUpdates(processId: string) {
    if (openProcId === processId) {
      setOpenProcId(null);
      return;
    }

    setOpenProcId(processId);
    setDraftByProc(prev => ({ ...prev, [processId]: prev[processId] ?? "" }));
    setVisibleByProc(prev => ({ ...prev, [processId]: prev[processId] ?? true }));

    await loadUpdates(processId);
  }

  async function addUpdate(processId: string) {
    const raw = draftByProc[processId] ?? "";
    const text = raw.trim();
    const visibleToClient = visibleByProc[processId] ?? true;

    if (!text) {
      alert("Digite o texto da atualização.");
      return;
    }

    setSavingByProc(prev => ({ ...prev, [processId]: true }));

    const body: any = {
      text,
      message: text,
      content: text,
      visibleToClient,
      isPublic: visibleToClient,
      public: visibleToClient,
    };

    const res = await fetch(`/api/admin/processes/${processId}/updates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(r => r.json()).catch(() => null);

    setSavingByProc(prev => ({ ...prev, [processId]: false }));

    if (!res?.ok) {
      alert(res?.message || "Erro ao salvar atualização.");
      return;
    }

    setDraftByProc(prev => ({ ...prev, [processId]: "" }));
    await loadUpdates(processId);
  }

  async function deleteUpdate(updateId: string, processId: string) {
    const ok = confirm("Excluir esta atualização?");
    if (!ok) return;

    const res = await fetch("/api/admin/process-updates/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ updateId }),
    }).then(r => r.json()).catch(() => null);

    if (!res?.ok) {
      alert(res?.message || "Erro ao excluir atualização.");
      return;
    }

    await loadUpdates(processId);
  }

  async function loadDeadlines(processId: string) {
    const res = await fetch(`/api/admin/process-deadlines?processId=${encodeURIComponent(processId)}`)
      .then(r => r.json())
      .catch(() => null);

    if (!res?.ok) return;

    setDeadlinesByProc(prev => ({ ...prev, [processId]: res.deadlines || [] }));
  }

  async function toggleDeadlines(processId: string) {
    if (openDeadlineProcId === processId) {
      setOpenDeadlineProcId(null);
      return;
    }

    setOpenDeadlineProcId(processId);
    setDeadlineTitleByProc(prev => ({ ...prev, [processId]: prev[processId] ?? "" }));
    setDeadlineDateByProc(prev => ({ ...prev, [processId]: prev[processId] ?? "" }));

    await loadDeadlines(processId);
  }

  async function addDeadline(processId: string) {
    const title = (deadlineTitleByProc[processId] ?? "").trim();
    const dueDate = (deadlineDateByProc[processId] ?? "").trim();

    if (!dueDate) {
      alert("Escolha a data do prazo.");
      return;
    }

    setSavingDeadlineByProc(prev => ({ ...prev, [processId]: true }));

    const res = await fetch("/api/admin/process-deadlines", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        processId,
        title: title || "Prazo",
        dueDate,
      }),
    }).then(r => r.json()).catch(() => null);

    setSavingDeadlineByProc(prev => ({ ...prev, [processId]: false }));

    if (!res?.ok) {
      alert(res?.message || "Erro ao salvar prazo.");
      return;
    }

    setDeadlineTitleByProc(prev => ({ ...prev, [processId]: "" }));
    setDeadlineDateByProc(prev => ({ ...prev, [processId]: "" }));
    await loadDeadlines(processId);
  }

  async function markDeadlineDone(id: string, processId: string) {
    await fetch("/api/admin/process-deadlines/done", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, done: true }),
    }).catch(() => null);

    await loadDeadlines(processId);
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }

  function formatDay(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString();
    } catch {
      return iso;
    }
  }

  function getUpdateText(u: UpdateItem) {
    return (u.text || u.message || u.content || "").toString();
  }

  function isVisible(u: UpdateItem) {
    const v1 = u.visibleToClient;
    const v2 = u.isPublic;
    return Boolean(v1 ?? v2 ?? false);
  }

  if (!me) return <div style={{ padding: 16 }}>Carregando...</div>;

  return (
    <AdminShell userName={me.name} role={me.role}>
      <div style={{ display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Processos</h1>

        <form onSubmit={createProcess} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Cadastrar processo</div>

          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ padding: 10 }}>
            <option value="">Selecione o cliente</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.document})
              </option>
            ))}
          </select>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ex: Pensão, Inventário...)" style={{ padding: 10 }} />
          <input value={cnj} onChange={(e) => setCnj(e.target.value)} placeholder="CNJ do processo (obrigatório)" style={{ padding: 10 }} />

          {msg && <div style={{ background: "#fff4f4", border: "1px solid #ffd0d0", padding: 10, borderRadius: 10 }}>{msg}</div>}

          <button style={{ padding: 10, borderRadius: 12, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 900 }}>
            Salvar processo
          </button>
        </form>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Lista</div>

          <div style={{ display: "grid", gap: 10 }}>
            {processes.map(p => {
              const draft = draftByProc[p.id] ?? "";
              const visible = visibleByProc[p.id] ?? true;
              const saving = savingByProc[p.id] ?? false;
              const shownNumber = (p.cnj || p.number || "").toString();

              const dTitle = deadlineTitleByProc[p.id] ?? "";
              const dDate = deadlineDateByProc[p.id] ?? "";
              const savingDeadline = savingDeadlineByProc[p.id] ?? false;

              return (
                <div key={p.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Cliente: {p.client?.name} ({p.client?.document})
                      </div>
                      {shownNumber && <div style={{ fontSize: 12, color: "#6b7280" }}>CNJ: {shownNumber}</div>}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => toggleUpdates(p.id)}
                        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white", cursor: "pointer", fontWeight: 900 }}>
                        Atualizações
                      </button>

                      <button type="button" onClick={() => toggleDeadlines(p.id)}
                        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 900 }}>
                        Prazos
                      </button>

                      <button type="button" onClick={() => archiveProcess(p.id)}
                        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 900 }}>
                        Arquivar
                      </button>

                      {isSuper && (
                        <button type="button" onClick={() => deleteProcess(p.id)}
                          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff", cursor: "pointer", fontWeight: 900, color: "#991b1b" }}>
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>

                  {openProcId === p.id && (
                    <div style={{ marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 12, display: "grid", gap: 10 }}>
                      <div style={{ fontWeight: 900 }}>Nova atualização</div>

                      <textarea
                        value={draft}
                        onChange={(e) => setDraftByProc(prev => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="Ex: Protocolo realizado. Aguardando despacho..."
                        rows={3}
                        style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                      />

                      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={visible}
                          onChange={(e) => setVisibleByProc(prev => ({ ...prev, [p.id]: e.target.checked }))}
                        />
                        Visível para o cliente
                      </label>

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => loadUpdates(p.id)}
                          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900 }}>
                          Recarregar
                        </button>

                        <button type="button" disabled={saving} onClick={() => addUpdate(p.id)}
                          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 900, opacity: saving ? .7 : 1 }}>
                          {saving ? "Salvando..." : "Salvar atualização"}
                        </button>
                      </div>

                      <div style={{ fontWeight: 900 }}>Histórico</div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {(updatesByProc[p.id] || []).map(u => (
                          <div key={u.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10 }}>
                            <div style={{ fontSize: 12, color: "#6b7280", display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <span>{formatDate(u.createdAt)}</span>
                              <span style={{ fontWeight: 900, color: isVisible(u) ? "#065f46" : "#6b7280" }}>
                                {isVisible(u) ? "Visível" : "Interna"}
                              </span>
                            </div>
                            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{getUpdateText(u)}</div>

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                              <button
                                type="button"
                                onClick={() => deleteUpdate(u.id, p.id)}
                                style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff", fontWeight: 900, color: "#991b1b", cursor: "pointer" }}
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))}

                        {(updatesByProc[p.id] || []).length === 0 && (
                          <div style={{ color: "#6b7280" }}>Nenhuma atualização ainda.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {openDeadlineProcId === p.id && (
                    <div style={{ marginTop: 12, borderTop: "1px solid #f0f0f0", paddingTop: 12, display: "grid", gap: 10 }}>
                      <div style={{ fontWeight: 900 }}>Novo prazo</div>

                      <input
                        value={dTitle}
                        onChange={(e) => setDeadlineTitleByProc(prev => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="Descrição do prazo (ex: contestação)"
                        style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                      />

                      <input
                        type="date"
                        value={dDate}
                        onChange={(e) => setDeadlineDateByProc(prev => ({ ...prev, [p.id]: e.target.value }))}
                        style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}
                      />

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => loadDeadlines(p.id)}
                          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900 }}>
                          Recarregar
                        </button>

                        <button type="button" disabled={savingDeadline} onClick={() => addDeadline(p.id)}
                          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 900, opacity: savingDeadline ? .7 : 1 }}>
                          {savingDeadline ? "Salvando..." : "Salvar prazo"}
                        </button>
                      </div>

                      <div style={{ fontWeight: 900 }}>Prazos</div>

                      <div style={{ display: "grid", gap: 8 }}>
                        {(deadlinesByProc[p.id] || []).filter(d => !d.done).map(d => (
                          <div key={d.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 900 }}>{d.title}</div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>Vence: {formatDay(d.dueDate)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => markDeadlineDone(d.id, p.id)}
                              style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900, cursor: "pointer" }}
                            >
                              Concluir
                            </button>
                          </div>
                        ))}

                        {(deadlinesByProc[p.id] || []).filter(d => !d.done).length === 0 && (
                          <div style={{ color: "#6b7280" }}>Nenhum prazo pendente.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {processes.length === 0 && <div style={{ color: "#6b7280" }}>Nenhum processo ativo.</div>}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
