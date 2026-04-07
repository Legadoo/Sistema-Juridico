"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import PremiumModal from "@/components/PremiumModal";
import PremiumToast from "@/components/PremiumToast";

type MeResponse = {
  ok?: boolean;
  user?: {
    id?: string;
    name?: string;
    role?: string;
  };
};

type Me = {
  id: string;
  name: string;
  role: string;
};

type Client = {
  id: string;
  name: string;
  document: string;
};

type ProcessUpdate = {
  id: string;
  text?: string;
  message?: string;
  content?: string;
  createdAt?: string;
  visibleToClient?: boolean;
  isPublic?: boolean;
  public?: boolean;
};

type ProcessRow = {
  id: string;
  cnj?: string;
  number?: string;
  processNumber?: string;
  title?: string;
  notes?: string;
  archived?: boolean;
  clientId?: string;
  client?: Client;
  updates?: ProcessUpdate[];
  createdAt?: string;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type CreateFormState = {
  clientId: string;
  cnj: string;
  title: string;
};

type UpdateFormState = {
  text: string;
  visibleToClient: boolean;
};

type ArchiveActionState = {
  process: ProcessRow;
} | null;

const emptyCreateForm: CreateFormState = {
  clientId: "",
  cnj: "",
  title: "",
};

const emptyUpdateForm: UpdateFormState = {
  text: "",
  visibleToClient: true,
};

function normalizeMe(data: MeResponse): Me | null {
  if (!data?.ok || !data?.user) return null;

  return {
    id: data.user.id ?? "",
    name: data.user.name ?? "Usuário",
    role: data.user.role ?? "SECRETARY",
  };
}

function formatDate(date?: string) {
  if (!date) return "Sem data";
  try {
    return new Date(date).toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
}

function getProcessNumber(process: ProcessRow) {
  return process.cnj || process.number || process.processNumber || "Sem número";
}

function getUpdateText(update: ProcessUpdate) {
  return update.text || update.message || update.content || "Atualização sem conteúdo";
}

function normalizeProcessesPayload(payload: unknown): ProcessRow[] {
  if (Array.isArray(payload)) return payload as ProcessRow[];

  if (typeof payload === "object" && payload !== null) {
    const value = (payload as { processes?: unknown }).processes;
    if (Array.isArray(value)) return value as ProcessRow[];
  }

  return [];
}

function normalizeClientsPayload(payload: unknown): Client[] {
  if (Array.isArray(payload)) return payload as Client[];

  if (typeof payload === "object" && payload !== null) {
    const value = (payload as { clients?: unknown }).clients;
    if (Array.isArray(value)) return value as Client[];
  }

  return [];
}

export default function ProcessesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [savingCreate, setSavingCreate] = useState(false);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProcessRow | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateFormState>(emptyUpdateForm);
  const [savingUpdate, setSavingUpdate] = useState(false);

  const [archiveAction, setArchiveAction] = useState<ArchiveActionState>(null);
  const [runningArchive, setRunningArchive] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const stats = useMemo(() => {
    const total = processes.length;
    const withUpdates = processes.filter((p) => (p.updates?.length || 0) > 0).length;
    const withoutUpdates = total - withUpdates;

    return {
      total,
      withUpdates,
      withoutUpdates,
    };
  }, [processes]);

  function showToast(message: string, type: ToastState["type"]) {
    setToast({ open: true, message, type });
  }

  async function load() {
    setLoading(true);

    const meResponse = await fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    const normalizedMe = normalizeMe(meResponse);
    if (!normalizedMe) {
      setLoading(false);
      return;
    }

    setMe(normalizedMe);

    const clientsResponse = await fetch("/api/admin/clients", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    const processesResponse = await fetch("/api/admin/processes", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    const normalizedClients = normalizeClientsPayload(clientsResponse?.clients ?? clientsResponse);
    const normalizedProcesses = normalizeProcessesPayload(processesResponse?.processes ?? processesResponse)
      .filter((item: { archived?: boolean }) => !item.archived);

    setClients(normalizedClients);
    setProcesses(normalizedProcesses);
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!ignore) {
        await load();
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    function updateViewport() {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  function openCreateModal() {
    setCreateForm(emptyCreateForm);
    setCreateOpen(true);
  }

  function openUpdateModal(process: ProcessRow) {
    setSelectedProcess(process);
    setUpdateForm(emptyUpdateForm);
    setUpdateOpen(true);
  }

  async function submitCreate() {
    const cleanClient = createForm.clientId.trim();
    const cleanCnj = createForm.cnj.trim();
    const cleanTitle = createForm.title.trim();

    if (!cleanClient || !cleanCnj) {
      showToast("Preencha o cliente e o número CNJ.", "warning");
      return;
    }

    const payload: Record<string, unknown> = {
      clientId: cleanClient,
      cnj: cleanCnj,
      number: cleanCnj,
      processNumber: cleanCnj,
      title: cleanTitle || "Processo",
    };

    setSavingCreate(true);

    try {
      const response = await fetch("/api/admin/processes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao criar processo.", "error");
        return;
      }

      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      await load();
      showToast("Processo criado com sucesso.", "success");
    } catch {
      showToast("Não foi possível criar o processo.", "error");
    } finally {
      setSavingCreate(false);
    }
  }

  async function submitUpdate() {
    if (!selectedProcess) return;

    const text = updateForm.text.trim();
    const visibleToClient = updateForm.visibleToClient;

    if (!text) {
      showToast("Digite o texto da atualização.", "warning");
      return;
    }

    const body: Record<string, unknown> = {
      text,
      message: text,
      content: text,
      visibleToClient,
      isPublic: visibleToClient,
      public: visibleToClient,
    };

    setSavingUpdate(true);

    try {
      const response = await fetch(`/api/admin/processes/${selectedProcess.id}/updates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao adicionar atualização.", "error");
        return;
      }

      setUpdateOpen(false);
      setSelectedProcess(null);
      setUpdateForm(emptyUpdateForm);
      await load();
      showToast("Atualização registrada com sucesso.", "success");
    } catch {
      showToast("Não foi possível registrar a atualização.", "error");
    } finally {
      setSavingUpdate(false);
    }
  }

  async function confirmArchive() {
    if (!archiveAction) return;

    setRunningArchive(true);

    try {
      const response = await fetch("/api/admin/processes/archive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ processId: archiveAction.process.id }),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao arquivar processo.", "error");
        return;
      }

      setArchiveAction(null);
      await load();
      showToast("Processo arquivado com sucesso.", "success");
    } catch {
      showToast("Não foi possível arquivar o processo.", "error");
    } finally {
      setRunningArchive(false);
    }
  }

  if (!me && loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
          color: "#E2E8F0",
          padding: 24,
          textAlign: "center",
        }}
      >
        Carregando módulo de processos...
      </div>
    );
  }

  const heroPadding = isMobile ? 20 : isTablet ? 24 : 28;
  const heroTitleSize = isMobile ? 26 : isTablet ? 30 : 34;
  const sectionGap = isMobile ? 18 : 24;
  const statPadding = isMobile ? 18 : 20;
  const statNumberSize = isMobile ? 28 : 32;

  return (
    <AdminShell role={me?.role ?? "SECRETARY"} userName={me?.name ?? "Usuário"}>
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PremiumModal
        open={createOpen}
        onClose={() => {
          if (!savingCreate) setCreateOpen(false);
        }}
        title="Novo processo"
        description="Cadastre um novo processo com um fluxo premium, limpo e mais confortável para longas jornadas de trabalho."
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setCreateOpen(false)}
              disabled={savingCreate}
            >
              Cancelar
            </button>
            <button
              className="jv-premium-btn"
              onClick={submitCreate}
              disabled={savingCreate}
            >
              {savingCreate ? "Salvando..." : "Salvar processo"}
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <select
            className="jv-premium-input"
            value={createForm.clientId}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, clientId: e.target.value }))}
            style={{
              colorScheme: "dark",
              backgroundColor: "rgba(255,255,255,0.03)",
              color: "#F8FAFC",
            }}
          >
            <option value="" style={{ backgroundColor: "#0F172A", color: "#94A3B8" }}>
              Selecione o cliente
            </option>
            {clients.map((client) => (
              <option
                key={client.id}
                value={client.id}
                style={{ backgroundColor: "#0F172A", color: "#F8FAFC" }}
              >
                {client.name}
              </option>
            ))}
          </select>

          <input
            className="jv-premium-input"
            placeholder="Número CNJ"
            value={createForm.cnj}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, cnj: e.target.value }))}
          />

          <input
            className="jv-premium-input"
            placeholder="Título do processo (opcional)"
            value={createForm.title}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
          />

          <div
            style={{
              padding: 14,
              borderRadius: 18,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "#94A3B8",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            O número CNJ também será usado como referência principal do processo nas rotas internas atuais.
          </div>
        </div>
      </PremiumModal>

      <PremiumModal
        open={updateOpen}
        onClose={() => {
          if (!savingUpdate) setUpdateOpen(false);
        }}
        title="Nova atualização processual"
        description={
          selectedProcess
            ? `Registrar movimentação para o processo ${getProcessNumber(selectedProcess)}.`
            : "Registrar uma nova atualização processual."
        }
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setUpdateOpen(false)}
              disabled={savingUpdate}
            >
              Cancelar
            </button>
            <button
              className="jv-premium-btn"
              onClick={submitUpdate}
              disabled={savingUpdate}
            >
              {savingUpdate ? "Salvando..." : "Salvar atualização"}
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <textarea
            className="jv-premium-input"
            placeholder="Digite a atualização processual"
            value={updateForm.text}
            onChange={(e) => setUpdateForm((prev) => ({ ...prev, text: e.target.value }))}
            style={{ minHeight: 130, resize: "vertical" }}
          />

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              color: "#E2E8F0",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={updateForm.visibleToClient}
              onChange={(e) =>
                setUpdateForm((prev) => ({
                  ...prev,
                  visibleToClient: e.target.checked,
                }))
              }
              style={{ marginTop: 2 }}
            />
            Exibir esta atualização para o cliente
          </label>
        </div>
      </PremiumModal>

      <PremiumModal
        open={!!archiveAction}
        onClose={() => {
          if (!runningArchive) setArchiveAction(null);
        }}
        title="Arquivar processo"
        description="O processo será removido da lista ativa e enviado para a área de arquivados."
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setArchiveAction(null)}
              disabled={runningArchive}
            >
              Cancelar
            </button>
            <button
              className="jv-premium-btn"
              onClick={confirmArchive}
              disabled={runningArchive}
            >
              {runningArchive ? "Processando..." : "Confirmar"}
            </button>
          </>
        }
        size="sm"
      >
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.18)",
            color: "#E2E8F0",
            lineHeight: 1.7,
          }}
        >
          {archiveAction?.process ? (
            <>
              <strong>{archiveAction.process.title || "Processo"}</strong>
              <div style={{ color: "#94A3B8", marginTop: 6 }}>
                Número: {getProcessNumber(archiveAction.process)}
              </div>
            </>
          ) : null}
        </div>
      </PremiumModal>

      <div style={{ display: "grid", gap: sectionGap }}>
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: isMobile ? 24 : 28,
            padding: heroPadding,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(15,23,42,0.88) 45%, rgba(56,189,248,0.10))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -10,
              width: isMobile ? 120 : 180,
              height: isMobile ? 120 : 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,58,237,0.28), transparent 70%)",
              filter: "blur(16px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -30,
              left: -20,
              width: isMobile ? 120 : 180,
              height: isMobile ? 120 : 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56,189,248,0.18), transparent 70%)",
              filter: "blur(14px)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 12 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#BFDBFE",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              GESTÃO DE PROCESSOS
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "flex-start",
                flexDirection: isMobile ? "column" : "row",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: heroTitleSize,
                    fontWeight: 900,
                    letterSpacing: "-0.05em",
                    lineHeight: 1.05,
                    color: "#F8FAFC",
                  }}
                >
                  Processos
                </h1>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#94A3B8",
                    fontSize: isMobile ? 14 : 15,
                    lineHeight: 1.7,
                    maxWidth: 760,
                  }}
                >
                  Gerencie processos, registre atualizações e mantenha a operação jurídica em um fluxo premium e mais agradável.
                </p>
              </div>

              <button
                className="jv-premium-btn"
                onClick={openCreateModal}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                Novo processo
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div className="jv-glass" style={{ borderRadius: 24, padding: statPadding }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Processos ativos</div>
            <div style={{ color: "#F8FAFC", fontSize: statNumberSize, fontWeight: 800, marginTop: 8 }}>
              {stats.total}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: statPadding }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Com atualizações</div>
            <div style={{ color: "#F8FAFC", fontSize: statNumberSize, fontWeight: 800, marginTop: 8 }}>
              {stats.withUpdates}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: statPadding }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Sem atualizações</div>
            <div style={{ color: "#F8FAFC", fontSize: statNumberSize, fontWeight: 800, marginTop: 8 }}>
              {stats.withoutUpdates}
            </div>
          </div>
        </section>

        <section
          className="jv-glass"
          style={{
            borderRadius: isMobile ? 24 : 28,
            padding: isMobile ? 18 : 22,
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: "#F8FAFC", fontSize: isMobile ? 20 : 22, fontWeight: 800 }}>
              Lista de processos
            </div>
            <div style={{ color: "#64748B", fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>
              Visão operacional dos processos ativos e suas movimentações recentes.
            </div>
          </div>

          {loading ? (
            <div style={{ color: "#94A3B8" }}>Carregando processos...</div>
          ) : processes.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94A3B8",
              }}
            >
              Nenhum processo cadastrado ainda.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {processes.map((process) => {
                const lastUpdate = process.updates?.[0];

                return (
                  <div
                    key={process.id}
                    style={{
                      borderRadius: 22,
                      padding: isMobile ? 16 : 18,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 18,
                        flexWrap: "wrap",
                        flexDirection: isMobile ? "column" : "row",
                      }}
                    >
                      <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            color: "#F8FAFC",
                            fontWeight: 800,
                            fontSize: isMobile ? 17 : 18,
                            wordBreak: "break-word",
                          }}
                        >
                          {process.title || "Processo"}
                        </div>

                        <div style={{ color: "#94A3B8", fontSize: 14, wordBreak: "break-word" }}>
                          {getProcessNumber(process)}
                        </div>

                        <div style={{ color: "#64748B", fontSize: 13, lineHeight: 1.6, wordBreak: "break-word" }}>
                          Cliente: {process.client?.name || "Não vinculado"}
                        </div>

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                          <span
                            style={{
                              padding: "8px 12px",
                              borderRadius: 999,
                              background: "rgba(99,102,241,0.10)",
                              color: "#C7D2FE",
                              border: "1px solid rgba(99,102,241,0.18)",
                              fontSize: 12,
                              fontWeight: 800,
                              wordBreak: "break-word",
                            }}
                          >
                            {process.updates?.length || 0} atualização(ões)
                          </span>

                          <span
                            style={{
                              padding: "8px 12px",
                              borderRadius: 999,
                              background: "rgba(56,189,248,0.08)",
                              color: "#BAE6FD",
                              border: "1px solid rgba(56,189,248,0.16)",
                              fontSize: 12,
                              fontWeight: 800,
                              wordBreak: "break-word",
                            }}
                          >
                            Criado em {formatDate(process.createdAt)}
                          </span>
                        </div>

                        {lastUpdate ? (
                          <div
                            style={{
                              marginTop: 8,
                              padding: isMobile ? 12 : 14,
                              borderRadius: 18,
                              background: "rgba(255,255,255,0.025)",
                              border: "1px solid rgba(255,255,255,0.04)",
                              maxWidth: "100%",
                            }}
                          >
                            <div
                              style={{
                                color: "#E2E8F0",
                                fontSize: 14,
                                lineHeight: 1.7,
                                wordBreak: "break-word",
                              }}
                            >
                              {getUpdateText(lastUpdate)}
                            </div>
                            <div style={{ color: "#64748B", fontSize: 12, marginTop: 8 }}>
                              Última atualização em {formatDate(lastUpdate.createdAt)}
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
                            Nenhuma atualização registrada ainda.
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          alignItems: "flex-start",
                          width: isMobile ? "100%" : "auto",
                          justifyContent: isMobile ? "stretch" : "flex-start",
                        }}
                      >
                        <button
                          className="jv-premium-btn-secondary"
                          onClick={() => openUpdateModal(process)}
                          style={{ width: isMobile ? "100%" : "auto" }}
                        >
                          Nova atualização
                        </button>

                        <button
                          className="jv-premium-btn-secondary"
                          onClick={() => setArchiveAction({ process })}
                          style={{ width: isMobile ? "100%" : "auto" }}
                        >
                          Arquivar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

