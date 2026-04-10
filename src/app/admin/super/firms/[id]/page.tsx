"use client";

import { useEffect, useState } from "react";
import SuperAdminShell from "@/components/SuperAdminShell";
import { fetchMeOrRedirect } from "@/lib/superadmin/clientGuard";

type FirmDetails = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  maxClients: number;
  usersCount: number;
  clientsCount: number;
  processesCount: number;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function SuperadminFirmDetailsPage({ params }: PageProps) {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [firmId, setFirmId] = useState<string>("");
  const [firm, setFirm] = useState<FirmDetails | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [usersError, setUsersError] = useState<string>("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    active: true,
    maxClients: "50",
  });

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SECRETARY",
  });

  const [editingTargetId, setEditingTargetId] = useState<string>("");
  const [editUserForm, setEditUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SECRETARY",
  });

  useEffect(() => {
    let ignore = false;

    async function boot() {
      const resolvedParams = await params;
      if (!ignore) {
        setFirmId(resolvedParams.id);
      }
    }

    void boot();

    return () => {
      ignore = true;
    };
  }, [params]);

  async function loadUsers(currentFirmId: string) {
    const usersRes = await fetch(`/api/super/firms/${currentFirmId}/users`, { cache: "no-store" });

    if (usersRes.status === 401) {
      window.location.href = "/login";
      return;
    }

    if (usersRes.ok) {
      const usersJson = await usersRes.json();
      setUsers(usersJson?.users ?? []);
      setUsersError("");
    } else {
      const usersJson = await usersRes.json().catch(() => null);
      setUsers([]);
      setUsersError(usersJson?.message ?? "Não foi possível carregar os usuários desta advocacia.");
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

      const firmRes = await fetch(`/api/super/firms/${firmId}`, { cache: "no-store" });

      if (firmRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (firmRes.ok) {
        const firmJson = await firmRes.json();
        if (!ignore && firmJson?.firm) {
          setFirm(firmJson.firm);
          setForm({
            name: firmJson.firm.name ?? "",
            slug: firmJson.firm.slug ?? "",
            active: Boolean(firmJson.firm.active),
            maxClients: String(firmJson.firm.maxClients ?? 50),
          });
        }
      }

      if (!ignore) {
        await loadUsers(firmId);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [firmId]);

  async function saveFirm() {
    if (!firmId) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/super/firms/${firmId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          active: form.active,
          maxClients: Number(form.maxClients),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setMessage(data?.message ?? "Não foi possível salvar a advocacia.");
        return;
      }

      setFirm((prev) =>
        prev
          ? {
              ...prev,
              name: data.firm.name,
              slug: data.firm.slug,
              active: data.firm.active,
              maxClients: data.firm.maxClients,
            }
          : prev
      );

      setMessage("Advocacia atualizada com sucesso.");
    } finally {
      setSaving(false);
    }
  }

  async function createUser() {
    if (!firmId) return;

    setCreatingUser(true);
    setMessage("");

    try {
      const response = await fetch(`/api/super/firms/${firmId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setMessage(data?.message ?? "Não foi possível criar o usuário.");
        return;
      }

      setUsers((prev) => [data.user, ...prev]);
      setUsersError("");
      setUserForm({
        name: "",
        email: "",
        password: "",
        role: "SECRETARY",
      });
      setMessage("Usuário criado com sucesso.");
    } finally {
      setCreatingUser(false);
    }
  }

  function startEditUser(user: UserItem) {
    setEditingTargetId(user.id);
    setEditUserForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setMessage("");
  }

  function cancelEditUser() {
    setEditingTargetId("");
    setEditUserForm({
      name: "",
      email: "",
      password: "",
      role: "SECRETARY",
    });
  }

  async function saveUserEdit() {
    if (!firmId || !editingTargetId) return;

    setEditingUser(true);
    setMessage("");

    try {
      const response = await fetch(`/api/super/firms/${firmId}/users/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingTargetId,
          name: editUserForm.name,
          email: editUserForm.email,
          password: editUserForm.password,
          role: editUserForm.role,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setMessage(data?.message ?? "Não foi possível atualizar o usuário.");
        return;
      }

      setUsers((prev) =>
        prev.map((user) => (user.id === editingTargetId ? data.user : user))
      );

      cancelEditUser();
      setMessage("Usuário atualizado com sucesso.");
    } finally {
      setEditingUser(false);
    }
  }

  async function toggleUserActive(user: UserItem) {
    if (!firmId) return;

    setMessage("");

    const response = await fetch(`/api/super/firms/${firmId}/users/toggle-active`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        active: !user.active,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      setMessage(data?.message ?? "Não foi possível alterar o status do usuário.");
      return;
    }

    setUsers((prev) =>
      prev.map((item) => (item.id === user.id ? data.user : item))
    );

    setMessage(`Usuário ${data.user.active ? "ativado" : "desativado"} com sucesso.`);
  }

  async function deleteUser(user: UserItem) {
    if (!firmId) return;

    const confirmed = window.confirm(`Deseja realmente excluir o usuário "${user.name}"?`);
    if (!confirmed) return;

    setMessage("");

    const response = await fetch(`/api/super/firms/${firmId}/users/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      setMessage(data?.message ?? "Não foi possível excluir o usuário.");
      return;
    }

    setUsers((prev) => prev.filter((item) => item.id !== user.id));

    if (editingTargetId === user.id) {
      cancelEditUser();
    }

    setMessage("Usuário excluído com sucesso.");
  }

  if (!me || !firm) {
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
        Carregando advocacia...
      </div>
    );
  }

  return (
    <SuperAdminShell userName={me.name}>
      <div style={{ display: "grid", gap: 24 }}>
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(15,23,42,0.92) 45%, rgba(99,102,241,0.10))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 10 }}>
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
                color: "#CFFAFE",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              GERENCIAMENTO DA ADVOCACIA
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                lineHeight: 1.05,
                color: "#F8FAFC",
              }}
            >
              {firm.name}
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 15,
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              Ajuste nome, identificador, status do escritório, limite atual de clientes
              e gerencie os usuários internos vinculados a esta advocacia.
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
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 18,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
              backdropFilter: "blur(14px)",
              display: "grid",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
              Dados da advocacia
            </div>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#94A3B8", fontSize: 13 }}>Nome</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="jv-premium-input"
                placeholder="Nome da advocacia"
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#94A3B8", fontSize: 13 }}>Slug</span>
              <input
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                className="jv-premium-input"
                placeholder="slug-da-advocacia"
              />
            </label>

            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "#94A3B8", fontSize: 13 }}>Limite de clientes</span>
              <input
                type="number"
                min="1"
                max="100000"
                value={form.maxClients}
                onChange={(e) => setForm((prev) => ({ ...prev, maxClients: e.target.value }))}
                className="jv-premium-input"
                placeholder="50"
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#E2E8F0",
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Advocacia ativa
            </label>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                className="jv-premium-btn"
                onClick={saveFirm}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar advocacia"}
              </button>

              <a
                href={`/admin/super/firms/${firmId}/clients`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  padding: "10px 16px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#E2E8F0",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Ver clientes
              </a>

              <a
                href={`/admin/super/firms/${firmId}/processes`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  padding: "10px 16px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#E2E8F0",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Ver processos
              </a>
            </div>
          </div>

          <div
            style={{
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
              backdropFilter: "blur(14px)",
              display: "grid",
              gap: 12,
              alignContent: "start",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
              Visão operacional
            </div>

            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Status</div>
              <div style={{ color: "#F8FAFC", fontWeight: 700 }}>
                {firm.active ? "Ativa" : "Inativa"}
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Usuários</div>
              <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{users.length}</div>
            </div>

            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Clientes</div>
              <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{firm.clientsCount}</div>
            </div>

            <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Processos</div>
              <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{firm.processesCount}</div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
              backdropFilter: "blur(14px)",
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
              Usuários da advocacia
            </div>

            {usersError ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  color: "#FCA5A5",
                }}
              >
                {usersError}
              </div>
            ) : null}

            {!usersError && users.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                }}
              >
                Nenhum usuário encontrado.
              </div>
            ) : null}

            {!usersError &&
              users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: 16,
                    borderRadius: 16,
                    background: editingTargetId === user.id ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
                    border: editingTargetId === user.id
                      ? "1px solid rgba(99,102,241,0.25)"
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{user.name}</div>
                      <div style={{ color: "#64748B", fontSize: 13 }}>{user.email}</div>
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
                        {user.role}
                      </span>

                      <span
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          background: user.active
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(239,68,68,0.12)",
                          color: user.active ? "#6EE7B7" : "#FCA5A5",
                          border: user.active
                            ? "1px solid rgba(16,185,129,0.18)"
                            : "1px solid rgba(239,68,68,0.18)",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {user.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      className="jv-premium-btn-secondary"
                      onClick={() => startEditUser(user)}
                    >
                      Editar
                    </button>

                    <button
                      className="jv-premium-btn-secondary"
                      onClick={() => toggleUserActive(user)}
                    >
                      {user.active ? "Desativar" : "Ativar"}
                    </button>

                    <button
                      className="jv-premium-btn-secondary"
                      onClick={() => deleteUser(user)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
              alignContent: "start",
            }}
          >
            <div
              style={{
                borderRadius: 24,
                padding: 22,
                background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
                backdropFilter: "blur(14px)",
                display: "grid",
                gap: 16,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
                Criar usuário
              </div>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ color: "#94A3B8", fontSize: 13 }}>Nome</span>
                <input
                  value={userForm.name}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="jv-premium-input"
                  placeholder="Nome do usuário"
                />
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ color: "#94A3B8", fontSize: 13 }}>Email</span>
                <input
                  value={userForm.email}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="jv-premium-input"
                  placeholder="email@dominio.com"
                />
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ color: "#94A3B8", fontSize: 13 }}>Senha</span>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="jv-premium-input"
                  placeholder="Senha inicial"
                />
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ color: "#94A3B8", fontSize: 13 }}>Perfil</span>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="jv-premium-input"
                  style={{ colorScheme: "dark" }}
                >
                  <option value="SECRETARY">SECRETARY</option>
                  <option value="MASTER">MASTER</option>
                </select>
              </label>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  className="jv-premium-btn"
                  onClick={createUser}
                  disabled={creatingUser}
                >
                  {creatingUser ? "Criando..." : "Criar usuário"}
                </button>
              </div>
            </div>

            <div
              style={{
                borderRadius: 24,
                padding: 22,
                background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
                backdropFilter: "blur(14px)",
                display: "grid",
                gap: 16,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
                Editar usuário
              </div>

              {!editingTargetId ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: "#94A3B8",
                  }}
                >
                  Selecione um usuário da lista para editar.
                </div>
              ) : (
                <>
                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ color: "#94A3B8", fontSize: 13 }}>Nome</span>
                    <input
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="jv-premium-input"
                      placeholder="Nome do usuário"
                    />
                  </label>

                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ color: "#94A3B8", fontSize: 13 }}>Email</span>
                    <input
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="jv-premium-input"
                      placeholder="email@dominio.com"
                    />
                  </label>

                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ color: "#94A3B8", fontSize: 13 }}>Nova senha</span>
                    <input
                      type="password"
                      value={editUserForm.password}
                      onChange={(e) => setEditUserForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="jv-premium-input"
                      placeholder="Deixe em branco para manter"
                    />
                  </label>

                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ color: "#94A3B8", fontSize: 13 }}>Perfil</span>
                    <select
                      value={editUserForm.role}
                      onChange={(e) => setEditUserForm((prev) => ({ ...prev, role: e.target.value }))}
                      className="jv-premium-input"
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="SECRETARY">SECRETARY</option>
                      <option value="MASTER">MASTER</option>
                    </select>
                  </label>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      className="jv-premium-btn"
                      onClick={saveUserEdit}
                      disabled={editingUser}
                    >
                      {editingUser ? "Salvando..." : "Salvar usuário"}
                    </button>

                    <button
                      className="jv-premium-btn-secondary"
                      onClick={cancelEditUser}
                      disabled={editingUser}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}