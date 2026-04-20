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
  id: string;
  name: string;
  document: string;
  phone?: string | null;
  email?: string | null;
  accessCode: string;
  createdAt?: string;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type ActionState =
  | { type: "archive"; client: Client }
  | { type: "delete"; client: Client }
  | null;

type FormState = {
  name: string;
  document: string;
  phone: string;
  email: string;
};

const emptyForm: FormState = {
  name: "",
  document: "",
  phone: "",
  email: "",
};

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function normalizeMe(data: MeResponse): Me | null {
  if (!data?.ok || !data?.user) return null;

  return {
    name: data.user.name ?? "Usuário",
    role: data.user.role ?? "SECRETARY",
  };
}

function formatDocument(value: string) {
  const digits = onlyDigits(value);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatDate(date?: string) {
  if (!date) return "Sem data";
  try {
    return new Date(date).toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
}

function extractMessagePayload(client: Client) {
  const link = `${window.location.origin}/acompanhar`;

  return `Olá, ${client.name}! Seu acesso ao acompanhamento no JuridicVas é:

CPF/CNPJ: ${client.document}
Código: ${client.accessCode}

Acesse: ${link}`;
}

export default function ClientsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  const [actionModal, setActionModal] = useState<ActionState>(null);
  const [runningAction, setRunningAction] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const isSuper = me?.role === "SUPERADMIN";
  const canEdit = me?.role === "SUPERADMIN" || me?.role === "MASTER" || me?.role === "SECRETARY";

  const stats = useMemo(() => {
    return {
      total: clients.length,
      withEmail: clients.filter((c) => !!c.email).length,
      withPhone: clients.filter((c) => !!c.phone).length,
    };
  }, [clients]);

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

    if (clientsResponse?.ok && Array.isArray(clientsResponse.clients)) {
      setClients(clientsResponse.clients);
    } else {
      setClients([]);
    }

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

  function openCreateModal() {
    setFormMode("create");
    setEditId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEditModal(client: Client) {
    if (!canEdit) return;

    setFormMode("edit");
    setEditId(client.id);
    setForm({
      name: client.name || "",
      document: client.document || "",
      phone: client.phone || "",
      email: client.email || "",
    });
    setFormOpen(true);
  }

  async function submitForm() {
    const payload = {
      name: form.name.trim(),
      document: onlyDigits(form.document),
      phone: form.phone.trim(),
      email: form.email.trim(),
    };

    if (!payload.name || !payload.document) {
      showToast("Preencha nome e CPF/CNPJ.", "warning");
      return;
    }

    setSavingForm(true);

    try {
      if (formMode === "create") {
        const response = await fetch("/api/admin/clients", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }).then(async (r) => ({
          ok: r.ok,
          data: await r.json().catch(() => ({})),
        }));

        if (!response.ok || !response.data?.ok) {
          showToast(response.data?.message || "Erro ao criar cliente.", "error");
          return;
        }

        setFormOpen(false);
        setForm(emptyForm);
        await load();
        showToast("Cliente criado com sucesso.", "success");
        return;
      }

      if (!editId) {
        showToast("Cliente inválido para edição.", "error");
        return;
      }

      const response = await fetch("/api/admin/clients/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: editId,
          ...payload,
        }),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao salvar cliente.", "error");
        return;
      }

      setFormOpen(false);
      setEditId(null);
      await load();
      showToast("Cliente atualizado com sucesso.", "success");
    } catch {
      showToast("Não foi possível concluir a operação.", "error");
    } finally {
      setSavingForm(false);
    }
  }

  async function confirmAction() {
    if (!actionModal) return;

    setRunningAction(true);

    try {
      if (actionModal.type === "archive") {
        const response = await fetch("/api/admin/clients/archive", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId: actionModal.client.id }),
        }).then(async (r) => ({
          ok: r.ok,
          data: await r.json().catch(() => ({})),
        }));

        if (!response.ok || !response.data?.ok) {
          showToast(response.data?.message || "Erro ao arquivar cliente.", "error");
          return;
        }

        setActionModal(null);
        await load();
        showToast("Cliente arquivado com sucesso.", "success");
        return;
      }

      if (actionModal.type === "delete") {
        const response = await fetch("/api/admin/clients/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId: actionModal.client.id }),
        }).then(async (r) => ({
          ok: r.ok,
          data: await r.json().catch(() => ({})),
        }));

        if (!response.ok || !response.data?.ok) {
          showToast(response.data?.message || "Erro ao excluir cliente.", "error");
          return;
        }

        setActionModal(null);
        await load();
        showToast("Cliente excluído permanentemente.", "success");
      }
    } catch {
      showToast("Não foi possível concluir a ação.", "error");
    } finally {
      setRunningAction(false);
    }
  }

  async function copyWhatsapp(client: Client) {
    try {
      await navigator.clipboard.writeText(extractMessagePayload(client));
      showToast("Mensagem copiada para enviar no WhatsApp.", "success");
    } catch {
      showToast("Não foi possível copiar automaticamente.", "error");
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
        }}
      >
        Carregando módulo de clientes...
      </div>
    );
  }

  return (
    <AdminShell role={me?.role ?? "SECRETARY"} userName={me?.name ?? "Usuário"}>
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PremiumModal
        open={formOpen}
        onClose={() => {
          if (!savingForm) setFormOpen(false);
        }}
        title={formMode === "create" ? "Novo cliente" : "Editar cliente"}
        description={
          formMode === "create"
            ? "Cadastre um novo cliente no JuridicVas com uma experiência premium e confortável."
            : "Atualize os dados do cliente sem sair do fluxo principal da operação."
        }
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setFormOpen(false)}
              disabled={savingForm}
            >
              Cancelar
            </button>
            <button
              className="jv-premium-btn"
              onClick={submitForm}
              disabled={savingForm}
            >
              {savingForm
                ? "Salvando..."
                : formMode === "create"
                ? "Salvar cliente"
                : "Salvar alterações"}
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <input
            className="jv-premium-input"
            placeholder="Nome do cliente"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="jv-premium-input"
            placeholder="CPF ou CNPJ"
            value={form.document}
            onChange={(e) => setForm((prev) => ({ ...prev, document: e.target.value }))}
          />
          <input
            className="jv-premium-input"
            placeholder="Telefone (opcional)"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <input
            className="jv-premium-input"
            placeholder="E-mail (opcional)"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
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
            O sistema gera automaticamente o código de acesso do cliente para a área de acompanhamento.
          </div>
        </div>
      </PremiumModal>

      <PremiumModal
        open={!!actionModal}
        onClose={() => {
          if (!runningAction) setActionModal(null);
        }}
        title={
          actionModal?.type === "delete"
            ? "Excluir cliente"
            : "Arquivar cliente"
        }
        description={
          actionModal?.type === "delete"
            ? "Esta ação é permanente. O cliente será removido definitivamente do sistema."
            : "O cliente deixará a lista ativa e será movido para a área de arquivados."
        }
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setActionModal(null)}
              disabled={runningAction}
            >
              Cancelar
            </button>
            <button
              className="jv-premium-btn"
              onClick={confirmAction}
              disabled={runningAction}
            >
              {runningAction ? "Processando..." : "Confirmar"}
            </button>
          </>
        }
        size="sm"
      >
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background:
              actionModal?.type === "delete"
                ? "rgba(239,68,68,0.08)"
                : "rgba(245,158,11,0.08)",
            border:
              actionModal?.type === "delete"
                ? "1px solid rgba(239,68,68,0.18)"
                : "1px solid rgba(245,158,11,0.18)",
            color: "#E2E8F0",
            lineHeight: 1.7,
          }}
        >
          {actionModal?.client ? (
            <>
              <strong>{actionModal.client.name}</strong>
              <div style={{ color: "#94A3B8", marginTop: 6 }}>
                Documento: {formatDocument(actionModal.client.document)}
              </div>
            </>
          ) : null}
        </div>
      </PremiumModal>

      <div style={{ display: "grid", gap: 24 }}>
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            padding: 28,
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
              width: 180,
              height: 180,
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
              width: 180,
              height: 180,
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
              GESTÃO DE CLIENTES
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: "-0.05em",
                    color: "#F8FAFC",
                  }}
                >
                  Clientes
                </h1>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#94A3B8",
                    fontSize: 15,
                    lineHeight: 1.7,
                    maxWidth: 760,
                  }}
                >
                  Cadastre, edite, arquive e organize clientes com uma experiência mais sofisticada e confortável.
                </p>
              </div>

              <button className="jv-premium-btn" onClick={openCreateModal}>
                Novo cliente
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div className="jv-glass" style={{ borderRadius: 24, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Clientes ativos</div>
            <div style={{ color: "#F8FAFC", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {stats.total}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Com e-mail cadastrado</div>
            <div style={{ color: "#F8FAFC", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {stats.withEmail}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Com telefone cadastrado</div>
            <div style={{ color: "#F8FAFC", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {stats.withPhone}
            </div>
          </div>
        </section>

        <section
          className="jv-glass"
          style={{
            borderRadius: 28,
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ color: "#F8FAFC", fontSize: 22, fontWeight: 800 }}>
                Lista de clientes
              </div>
              <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                O sistema gera automaticamente um código de acesso para o portal do cliente.
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ color: "#94A3B8" }}>Carregando clientes...</div>
          ) : clients.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94A3B8",
              }}
            >
              Nenhum cliente cadastrado ainda.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {clients.map((client) => (
                <div
                  key={client.id}
                  style={{
                    borderRadius: 22,
                    padding: 18,
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
                    }}
                  >
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ color: "#F8FAFC", fontWeight: 800, fontSize: 18 }}>
                        {client.name}
                      </div>

                      <div style={{ color: "#94A3B8", fontSize: 14 }}>
                        {formatDocument(client.document)}
                      </div>

                      <div style={{ color: "#64748B", fontSize: 13 }}>
                        {[client.phone, client.email].filter(Boolean).join(" · ") || "Sem telefone e e-mail cadastrados"}
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
                          }}
                        >
                          Código: {client.accessCode}
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
                          }}
                        >
                          Criado em {formatDate(client.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <button
                        className="jv-premium-btn-secondary"
                        onClick={() => copyWhatsapp(client)}
                      >
                        Copiar mensagem
                      </button>

                      <button
                        className="jv-premium-btn-secondary"
                        onClick={() => setActionModal({ type: "archive", client })}
                      >
                        Arquivar
                      </button>

                      {canEdit && (
                        <button
                          className="jv-premium-btn-secondary"
                          onClick={() => openEditModal(client)}
                        >
                          Editar
                        </button>
                      )}

                      {isSuper && (
                        <button
                          className="jv-premium-btn-secondary"
                          onClick={() => setActionModal({ type: "delete", client })}
                          style={{
                            borderColor: "rgba(239,68,68,0.22)",
                            color: "#FCA5A5",
                            background: "rgba(239,68,68,0.07)",
                          }}
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
