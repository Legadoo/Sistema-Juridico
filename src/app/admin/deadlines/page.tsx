"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import PremiumModal from "@/components/PremiumModal";
import PremiumToast from "@/components/PremiumToast";

type MeResponse = {
  ok?: boolean;
  user?: {
    name?: string;
    role?: string;
  };
};

type Me = {
  name: string;
  role: string;
};

type Client = {
  name?: string;
  document?: string;
};

type ProcessRef = {
  id: string;
  title?: string;
  cnj?: string;
  number?: string;
  processNumber?: string;
  archived?: boolean;
  client?: {
    name?: string;
    document?: string;
  };
};

type DeadlineRow = {
  id: string;
  title?: string;
  description?: string;
  dueDate?: string;
  done?: boolean;
  createdAt?: string;
  client?: Client;
  process?: ProcessRef;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type FormState = {
  processId: string;
  title: string;
  description: string;
  dueAt: string;
};

const emptyForm: FormState = {
  processId: "",
  title: "",
  description: "",
  dueAt: "",
};

function normalizeMe(data: MeResponse): Me | null {
  if (!data?.ok || !data?.user) return null;

  return {
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

function getProcessNumber(process?: ProcessRef) {
  if (!process) return "Sem processo";
  return process.cnj || process.number || process.processNumber || "Sem número";
}

function getProcessLabel(process: ProcessRef) {
  const number = getProcessNumber(process);
  const title = process.title?.trim();

  if (title) return `${number} — ${title}`;
  return number;
}

function isLate(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
}

const fieldStyle: React.CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#F8FAFC",
  borderRadius: 16,
  padding: "13px 14px",
  outline: "none",
  boxSizing: "border-box",
};

export default function DeadlinesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineRow[]>([]);
  const [processes, setProcesses] = useState<ProcessRef[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [savingCreate, setSavingCreate] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const stats = useMemo(() => {
    const pending = deadlines.filter((d) => !d.done);
    const done = deadlines.filter((d) => d.done);
    const late = pending.filter((d) => isLate(d.dueDate));

    return {
      total: deadlines.length,
      pending: pending.length,
      done: done.length,
      late: late.length,
    };
  }, [deadlines]);

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

    const [deadlinesResponse, processesResponse] = await Promise.all([
      fetch("/api/admin/deadlines?all=1", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null),
      fetch("/api/admin/processes", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null),
    ]);

    const deadlinesList =
      Array.isArray(deadlinesResponse?.deadlines) ? deadlinesResponse.deadlines :
      Array.isArray(deadlinesResponse) ? deadlinesResponse :
      [];

    const processesList =
      Array.isArray(processesResponse?.processes) ? processesResponse.processes :
      Array.isArray(processesResponse) ? processesResponse :
      [];

    setDeadlines(deadlinesList);
    setProcesses(processesList.filter((p: { archived?: boolean }) => !p.archived));
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

  async function submitCreate() {
    const processId = form.processId.trim();
    const title = form.title.trim();
    const description = form.description.trim();
    const dueAt = form.dueAt;

    if (!processId) {
      showToast("Selecione o processo.", "warning");
      return;
    }

    if (!title) {
      showToast("Preencha o título do prazo.", "warning");
      return;
    }

    if (!dueAt) {
      showToast("Preencha a data do prazo.", "warning");
      return;
    }

    setSavingCreate(true);

    try {
      const payload = {
        processId,
        title,
        description,
        dueDate: dueAt,
        dueAt,
        date: dueAt,
        deadlineAt: dueAt,
      };

      const response = await fetch("/api/admin/deadlines", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => ({
        ok: r.ok,
        status: r.status,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(
          response.data?.message || "Erro ao criar prazo. Verifique os campos obrigatórios.",
          "error"
        );
        return;
      }

      setCreateOpen(false);
      setForm(emptyForm);
      await load();
      showToast("Prazo criado com sucesso.", "success");
    } catch {
      showToast("Não foi possível criar o prazo.", "error");
    } finally {
      setSavingCreate(false);
    }
  }

  async function markDone(deadline: DeadlineRow) {
    try {
      const response = await fetch("/api/admin/deadlines/done", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: deadline.id }),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao concluir prazo.", "error");
        return;
      }

      await load();
      showToast("Prazo marcado como concluído.", "success");
    } catch {
      showToast("Não foi possível concluir o prazo.", "error");
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
        Carregando prazos...
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
        title="Novo prazo"
        description="Cadastre um novo prazo vinculado a um processo, mantendo a organização jurídica do sistema."
        footer={
          <>
            <button className="jv-premium-btn-secondary" onClick={() => setCreateOpen(false)} disabled={savingCreate}>
              Cancelar
            </button>
            <button className="jv-premium-btn" onClick={submitCreate} disabled={savingCreate}>
              {savingCreate ? "Salvando..." : "Salvar prazo"}
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
              Processo
            </label>
            <select
              value={form.processId}
              onChange={(e) => setForm((prev) => ({ ...prev, processId: e.target.value }))}
              style={{
                ...fieldStyle,
                colorScheme: "dark",
                backgroundColor: "rgba(255,255,255,0.04)",
                color: "#F8FAFC",
              }}
            >
              <option value="" style={{ background: "#0F172A", color: "#94A3B8" }}>
                Selecione o processo
              </option>
              {processes.map((process) => (
                <option
                  key={process.id}
                  value={process.id}
                  style={{ background: "#0F172A", color: "#F8FAFC" }}
                >
                  {getProcessLabel(process)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
              Título do prazo
            </label>
            <input
              placeholder="Ex.: Contestação, audiência, manifestação..."
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              style={fieldStyle}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
              Descrição
            </label>
            <textarea
              placeholder="Descrição opcional do prazo"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              style={{ ...fieldStyle, minHeight: 110, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
              Data
            </label>
            <input
              type="date"
              value={form.dueAt}
              onChange={(e) => setForm((prev) => ({ ...prev, dueAt: e.target.value }))}
              style={fieldStyle}
            />
          </div>
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
              CONTROLE DE PRAZOS
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
                  Prazos
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
                  Acompanhe prazos pendentes, concluídos e em atraso com vínculo real ao processo correspondente.
                </p>
              </div>

              <button
                className="jv-premium-btn"
                onClick={() => setCreateOpen(true)}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                Novo prazo
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
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Prazos totais</div>
            <div style={{ color: "#F8FAFC", fontSize: statNumberSize, fontWeight: 800, marginTop: 8 }}>
              {stats.total}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: statPadding }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Pendentes</div>
            <div style={{ color: "#F8FAFC", fontSize: statNumberSize, fontWeight: 800, marginTop: 8 }}>
              {stats.pending}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: statPadding }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Concluídos</div>
            <div style={{ color: "#F8FAFC", fontSize: statNumberSize, fontWeight: 800, marginTop: 8 }}>
              {stats.done}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: statPadding }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Em atraso</div>
            <div style={{ color: "#FCA5A5", fontSize: statNumberSize, fontWeight: 800, marginTop: 8 }}>
              {stats.late}
            </div>
          </div>
        </section>

        <section className="jv-glass" style={{ borderRadius: isMobile ? 24 : 28, padding: isMobile ? 18 : 22 }}>
          {loading ? (
            <div style={{ color: "#94A3B8" }}>Carregando prazos...</div>
          ) : deadlines.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94A3B8",
              }}
            >
              Nenhum prazo cadastrado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {deadlines.map((deadline) => {
                const late = !deadline.done && isLate(deadline.dueDate);

                return (
                  <div
                    key={deadline.id}
                    style={{
                      borderRadius: 22,
                      padding: isMobile ? 16 : 18,
                      background: late ? "rgba(239,68,68,0.05)" : "rgba(255,255,255,0.03)",
                      border: late
                        ? "1px solid rgba(239,68,68,0.18)"
                        : "1px solid rgba(255,255,255,0.05)",
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
                          {deadline.title || "Prazo"}
                        </div>

                        <div style={{ color: "#94A3B8", fontSize: 14 }}>
                          Vencimento: {formatDate(deadline.dueDate)}
                        </div>

                        {deadline.description ? (
                          <div
                            style={{
                              color: "#64748B",
                              fontSize: 13,
                              lineHeight: 1.7,
                              wordBreak: "break-word",
                            }}
                          >
                            {deadline.description}
                          </div>
                        ) : null}

                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                          <span
                            style={{
                              padding: "8px 12px",
                              borderRadius: 999,
                              background: deadline.done
                                ? "rgba(16,185,129,0.10)"
                                : late
                                ? "rgba(239,68,68,0.10)"
                                : "rgba(245,158,11,0.10)",
                              color: deadline.done
                                ? "#A7F3D0"
                                : late
                                ? "#FCA5A5"
                                : "#FDE68A",
                              border: deadline.done
                                ? "1px solid rgba(16,185,129,0.18)"
                                : late
                                ? "1px solid rgba(239,68,68,0.18)"
                                : "1px solid rgba(245,158,11,0.18)",
                              fontSize: 12,
                              fontWeight: 800,
                              wordBreak: "break-word",
                            }}
                          >
                            {deadline.done ? "Concluído" : late ? "Em atraso" : "Pendente"}
                          </span>

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
                            Cliente: {deadline.process?.client?.name || "Cliente não informado"}
                          </span>

                          {deadline.process ? (
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
                              Processo: {getProcessNumber(deadline.process)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {!deadline.done && (
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
                            onClick={() => markDone(deadline)}
                            style={{ width: isMobile ? "100%" : "auto" }}
                          >
                            Marcar como concluído
                          </button>
                        </div>
                      )}
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

