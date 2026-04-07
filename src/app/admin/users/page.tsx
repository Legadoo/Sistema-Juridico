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

type UserRole = "SUPERADMIN" | "MASTER" | "SECRETARY";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type FormState = {
  name: string;
  email: string;
  password: string;
  role: "MASTER" | "SECRETARY";
};

type DeleteAction = {
  user: UserRow;
} | null;

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  role: "SECRETARY",
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

export default function UsersPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [savingCreate, setSavingCreate] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteAction, setDeleteAction] = useState<DeleteAction>(null);
  const [runningDelete, setRunningDelete] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const isSuper = me?.role === "SUPERADMIN";
  const canManage = me?.role === "SUPERADMIN" || me?.role === "MASTER";

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.active).length,
      inactive: users.filter((u) => !u.active).length,
    };
  }, [users]);

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

    const response = await fetch("/api/admin/users", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    const list =
      Array.isArray(response?.users) ? response.users :
      Array.isArray(response) ? response :
      [];

    setUsers(list);
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
    setCreateForm(emptyForm);
    setCreateOpen(true);
  }

  function openEditModal(user: UserRow) {
    setEditId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role === "MASTER" ? "MASTER" : "SECRETARY",
    });
    setEditOpen(true);
  }

  async function submitCreate() {
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      showToast("Preencha nome, email e senha.", "warning");
      return;
    }

    setSavingCreate(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          role: createForm.role,
        }),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao criar usuário.", "error");
        return;
      }

      setCreateOpen(false);
      setCreateForm(emptyForm);
      await load();
      showToast("Usuário criado com sucesso.", "success");
    } catch {
      showToast("Não foi possível criar o usuário.", "error");
    } finally {
      setSavingCreate(false);
    }
  }

  async function submitEdit() {
    if (!editId) return;

    const payload: Record<string, unknown> = {
      userId: editId,
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      password: editForm.password,
    };

    if (isSuper) {
      payload.role = editForm.role;
    }

    setSavingEdit(true);

    try {
      const response = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao atualizar usuário.", "error");
        return;
      }

      setEditOpen(false);
      setEditId(null);
      await load();
      showToast("Usuário atualizado com sucesso.", "success");
    } catch {
      showToast("Não foi possível atualizar o usuário.", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleActive(user: UserRow) {
    try {
      const response = await fetch("/api/admin/users/toggle-active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao alterar status do usuário.", "error");
        return;
      }

      await load();
      showToast(
        user.active ? "Usuário desativado com sucesso." : "Usuário ativado com sucesso.",
        "success"
      );
    } catch {
      showToast("Não foi possível alterar o status.", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteAction) return;

    setRunningDelete(true);

    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: deleteAction.user.id }),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao excluir usuário.", "error");
        return;
      }

      setDeleteAction(null);
      await load();
      showToast("Usuário excluído com sucesso.", "success");
    } catch {
      showToast("Não foi possível excluir o usuário.", "error");
    } finally {
      setRunningDelete(false);
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
        Carregando usuários...
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
        open={createOpen}
        onClose={() => {
          if (!savingCreate) setCreateOpen(false);
        }}
        title="Novo usuário"
        description="Cadastre um novo integrante interno no JuridicVas com o padrão visual premium do sistema."
        footer={
          <>
            <button className="jv-premium-btn-secondary" onClick={() => setCreateOpen(false)} disabled={savingCreate}>
              Cancelar
            </button>
            <button className="jv-premium-btn" onClick={submitCreate} disabled={savingCreate}>
              {savingCreate ? "Salvando..." : "Salvar usuário"}
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <input
            className="jv-premium-input"
            placeholder="Nome"
            value={createForm.name}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="jv-premium-input"
            placeholder="Email"
            value={createForm.email}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <input
            className="jv-premium-input"
            placeholder="Senha"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
          />

          {isSuper && (
            <select
              className="jv-premium-input"
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  role: e.target.value as "MASTER" | "SECRETARY",
                }))
              }
            >
              <option value="SECRETARY">SECRETARY</option>
              <option value="MASTER">MASTER</option>
            </select>
          )}
        </div>
      </PremiumModal>

      <PremiumModal
        open={editOpen}
        onClose={() => {
          if (!savingEdit) setEditOpen(false);
        }}
        title="Editar usuário"
        description="Atualize os dados do usuário sem sair do fluxo de gestão administrativa."
        footer={
          <>
            <button className="jv-premium-btn-secondary" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Cancelar
            </button>
            <button className="jv-premium-btn" onClick={submitEdit} disabled={savingEdit}>
              {savingEdit ? "Salvando..." : "Salvar alterações"}
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <input
            className="jv-premium-input"
            placeholder="Nome"
            value={editForm.name}
            onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <input
            className="jv-premium-input"
            placeholder="Email"
            value={editForm.email}
            onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <input
            className="jv-premium-input"
            placeholder="Nova senha (opcional)"
            type="password"
            value={editForm.password}
            onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
          />

          {isSuper && (
            <select
              className="jv-premium-input"
              value={editForm.role}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  role: e.target.value as "MASTER" | "SECRETARY",
                }))
              }
            >
              <option value="SECRETARY">SECRETARY</option>
              <option value="MASTER">MASTER</option>
            </select>
          )}
        </div>
      </PremiumModal>

      <PremiumModal
        open={!!deleteAction}
        onClose={() => {
          if (!runningDelete) setDeleteAction(null);
        }}
        title="Excluir usuário"
        description="Esta ação removerá permanentemente o usuário selecionado."
        footer={
          <>
            <button className="jv-premium-btn-secondary" onClick={() => setDeleteAction(null)} disabled={runningDelete}>
              Cancelar
            </button>
            <button className="jv-premium-btn" onClick={confirmDelete} disabled={runningDelete}>
              {runningDelete ? "Processando..." : "Confirmar"}
            </button>
          </>
        }
        size="sm"
      >
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.18)",
            color: "#E2E8F0",
            lineHeight: 1.7,
          }}
        >
          {deleteAction?.user ? (
            <>
              <strong>{deleteAction.user.name}</strong>
              <div style={{ color: "#94A3B8", marginTop: 6 }}>
                Email: {deleteAction.user.email}
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
              GESTÃO DE USUÁRIOS
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
                  Usuários
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
                  Controle premium de acesso, permissões e status dos usuários internos do sistema.
                </p>
              </div>

              {canManage && (
                <button className="jv-premium-btn" onClick={openCreateModal}>
                  Novo usuário
                </button>
              )}
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
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Usuários totais</div>
            <div style={{ color: "#F8FAFC", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {stats.total}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Ativos</div>
            <div style={{ color: "#F8FAFC", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {stats.active}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Inativos</div>
            <div style={{ color: "#F8FAFC", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {stats.inactive}
            </div>
          </div>
        </section>

        <section className="jv-glass" style={{ borderRadius: 28, padding: 22 }}>
          {loading ? (
            <div style={{ color: "#94A3B8" }}>Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94A3B8",
              }}
            >
              Nenhum usuário encontrado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {users.map((user) => (
                <div
                  key={user.id}
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
                        {user.name}
                      </div>

                      <div style={{ color: "#94A3B8", fontSize: 14 }}>
                        {user.email}
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
                          {user.role}
                        </span>

                        <span
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            background: user.active ? "rgba(16,185,129,0.10)" : "rgba(245,158,11,0.10)",
                            color: user.active ? "#A7F3D0" : "#FDE68A",
                            border: user.active
                              ? "1px solid rgba(16,185,129,0.18)"
                              : "1px solid rgba(245,158,11,0.18)",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {user.active ? "Ativo" : "Inativo"}
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
                          Criado em {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                      {canManage && (
                        <>
                          <button className="jv-premium-btn-secondary" onClick={() => openEditModal(user)}>
                            Editar
                          </button>

                          <button className="jv-premium-btn-secondary" onClick={() => toggleActive(user)}>
                            {user.active ? "Desativar" : "Ativar"}
                          </button>
                        </>
                      )}

                      {isSuper && (
                        <button
                          className="jv-premium-btn-secondary"
                          onClick={() => setDeleteAction({ user })}
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
