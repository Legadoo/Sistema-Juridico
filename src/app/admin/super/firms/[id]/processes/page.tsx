"use client";

import { useEffect, useState } from "react";
import SuperAdminShell from "@/components/SuperAdminShell";
import { fetchMeOrRedirect } from "@/lib/superadmin/clientGuard";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ProcessItem = {
  id: string;
  cnj: string;
  tribunal?: string | null;
  vara?: string | null;
  status: string;
  archived: boolean;
  client?: {
    id: string;
    name: string;
    document: string;
  } | null;
};

export default function SuperadminFirmProcessesPage({ params }: PageProps) {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [firmId, setFirmId] = useState("");
  const [firmName, setFirmName] = useState("Advocacia");
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [message, setMessage] = useState("");
  const [editingProcessId, setEditingProcessId] = useState("");
  const [savingProcess, setSavingProcess] = useState(false);

  const [editForm, setEditForm] = useState({
    cnj: "",
    tribunal: "",
    vara: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    let ignore = false;

    async function boot() {
      const resolved = await params;
      if (!ignore) setFirmId(resolved.id);
    }

    void boot();

    return () => {
      ignore = true;
    };
  }, [params]);

  async function loadProcesses(currentFirmId: string) {
    const res = await fetch(`/api/super/firms/${currentFirmId}/processes`, { cache: "no-store" });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    const data = await res.json().catch(() => null);

    if (data?.ok) {
      setFirmName(data.firm?.name ?? "Advocacia");
      setProcesses(data.processes ?? []);
    }
  }

  useEffect(() => {
    if (!firmId) return;

    let ignore = false;

    async function load() {
      const me = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!me) return;

      await loadProcesses(firmId);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [firmId]);

  function startEdit(process: ProcessItem) {
    setEditingProcessId(process.id);
    setEditForm({
      cnj: process.cnj,
      tribunal: process.tribunal ?? "",
      vara: process.vara ?? "",
      status: process.status,
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditingProcessId("");
    setEditForm({
      cnj: "",
      tribunal: "",
      vara: "",
      status: "ACTIVE",
    });
  }

  async function saveProcess() {
    if (!firmId || !editingProcessId) return;

    setSavingProcess(true);
    setMessage("");

    try {
      const res = await fetch(`/api/super/firms/${firmId}/processes/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processId: editingProcessId,
          cnj: editForm.cnj,
          tribunal: editForm.tribunal,
          vara: editForm.vara,
          status: editForm.status,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMessage(data?.message ?? "Não foi possível atualizar o processo.");
        return;
      }

      setProcesses((prev) =>
        prev.map((item) => (item.id === editingProcessId ? data.process : item))
      );

      cancelEdit();
      setMessage("Processo atualizado com sucesso.");
    } finally {
      setSavingProcess(false);
    }
  }

  async function archiveProcess(process: ProcessItem) {
    if (!firmId) return;

    const endpoint = process.archived ? "unarchive" : "archive";

    const res = await fetch(`/api/super/firms/${firmId}/processes/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processId: process.id }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMessage(data?.message ?? "Não foi possível alterar o status do processo.");
      return;
    }

    setProcesses((prev) =>
      prev.map((item) => (item.id === process.id ? data.process : item))
    );

    setMessage(`Processo ${data.process.archived ? "arquivado" : "desarquivado"} com sucesso.`);
  }

  async function deleteProcess(process: ProcessItem) {
    if (!firmId) return;

    const confirmed = window.confirm(`Deseja realmente excluir o processo "${process.cnj}"?`);
    if (!confirmed) return;

    const res = await fetch(`/api/super/firms/${firmId}/processes/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processId: process.id }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMessage(data?.message ?? "Não foi possível excluir o processo.");
      return;
    }

    setProcesses((prev) => prev.filter((item) => item.id !== process.id));

    if (editingProcessId === process.id) {
      cancelEdit();
    }

    setMessage("Processo excluído com sucesso.");
  }

  if (!me) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
          color: "#E2E8F0",
        }}
      >
        Carregando processos...
      </div>
    );
  }

  return (
    <SuperAdminShell userName={me.name}>
      <div style={{ display: "grid", gap: 24 }}>
        <section
          style={{
            borderRadius: 28,
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(15,23,42,0.92) 45%, rgba(99,102,241,0.10))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#CFFAFE",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              PROCESSOS DA ADVOCACIA
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                color: "#F8FAFC",
              }}
            >
              {firmName}
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              Operação completa dos processos vinculados a este escritório.
            </p>
          </div>
        </section>

        {message ? (
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: "rgba(99,102,241,0.10)",
              border: "1px solid rgba(99,102,241,0.18)",
              color: "#C7D2FE",
            }}
          >
            {message}
          </div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 0.95fr",
            gap: 18,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "grid",
              gap: 14,
            }}
          >
            {processes.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                }}
              >
                Nenhum processo encontrado nesta advocacia.
              </div>
            ) : (
              processes.map((process) => (
                <div
                  key={process.id}
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: 18,
                    borderRadius: 18,
                    background: editingProcessId === process.id ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
                    border: editingProcessId === process.id
                      ? "1px solid rgba(99,102,241,0.25)"
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#F8FAFC" }}>
                        CNJ {process.cnj}
                      </div>
                      <div style={{ color: "#64748B", fontSize: 13 }}>
                        Cliente: {process.client?.name ?? "Sem cliente"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          background: "rgba(99,102,241,0.12)",
                          color: "#C7D2FE",
                          border: "1px solid rgba(99,102,241,0.18)",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {process.status}
                      </span>

                      <span
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          background: process.archived
                            ? "rgba(239,68,68,0.12)"
                            : "rgba(16,185,129,0.12)",
                          color: process.archived ? "#FCA5A5" : "#6EE7B7",
                          border: process.archived
                            ? "1px solid rgba(239,68,68,0.18)"
                            : "1px solid rgba(16,185,129,0.18)",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {process.archived ? "Arquivado" : "Ativo"}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Tribunal</div>
                      <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{process.tribunal || "Não informado"}</div>
                    </div>

                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Vara</div>
                      <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{process.vara || "Não informado"}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="jv-premium-btn-secondary" onClick={() => startEdit(process)}>
                      Editar
                    </button>

                    <button className="jv-premium-btn-secondary" onClick={() => archiveProcess(process)}>
                      {process.archived ? "Desarquivar" : "Arquivar"}
                    </button>

                    <button className="jv-premium-btn-secondary" onClick={() => deleteProcess(process)}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "grid",
              gap: 16,
              alignContent: "start",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
              Editar processo
            </div>

            {!editingProcessId ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                }}
              >
                Selecione um processo da lista para editar.
              </div>
            ) : (
              <>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>CNJ</span>
                  <input
                    value={editForm.cnj}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, cnj: e.target.value }))}
                    className="jv-premium-input"
                    placeholder="CNJ"
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>Tribunal</span>
                  <input
                    value={editForm.tribunal}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, tribunal: e.target.value }))}
                    className="jv-premium-input"
                    placeholder="Tribunal"
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>Vara</span>
                  <input
                    value={editForm.vara}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, vara: e.target.value }))}
                    className="jv-premium-input"
                    placeholder="Vara"
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>Status</span>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="jv-premium-input"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button className="jv-premium-btn" onClick={saveProcess} disabled={savingProcess}>
                    {savingProcess ? "Salvando..." : "Salvar processo"}
                  </button>

                  <button className="jv-premium-btn-secondary" onClick={cancelEdit} disabled={savingProcess}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}