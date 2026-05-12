"use client";

import { useEffect, useMemo, useState } from "react";
import SuperAdminShell from "@/components/SuperAdminShell";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  active: boolean;
  emailVerified?: boolean;
  onboardingStatus?: string | null;
  selectedPlanId?: string | null;
  selectedPlanNameSnapshot?: string | null;
  firmId?: string | null;
  firm?: {
    id: string;
    name: string;
  } | null;
};

type FirmOption = {
  id: string;
  name: string;
  active: boolean;
};

type PlanOption = {
  id: string;
  name: string;
  isActive: boolean;
  isPurchasable: boolean;
};

type EditForm = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  onboardingStatus: string;
  selectedPlanId: string;
  firmId: string;
};

type UserCategory =
  | "ALL"
  | "PLAN_REQUIRED"
  | "PLAN_PENDING_PAYMENT"
  | "FIRM_REQUIRED"
  | "ACTIVE"
  | "INACTIVE";

const emptyEditForm: EditForm = {
  id: "",
  name: "",
  email: "",
  phone: "",
  role: "SECRETARY",
  active: true,
  onboardingStatus: "PLAN_REQUIRED",
  selectedPlanId: "",
  firmId: "",
};

function categoryLabel(category: UserCategory) {
  if (category === "ALL") return "Todos";
  if (category === "PLAN_REQUIRED") return "Aguardando plano";
  if (category === "PLAN_PENDING_PAYMENT") return "Pagamento pendente";
  if (category === "FIRM_REQUIRED") return "Aguardando advocacia";
  if (category === "ACTIVE") return "Clientes ativos";
  if (category === "INACTIVE") return "Inativos";
  return category;
}

function statusColor(status?: string | null, active = true) {
  if (!active) return "#FCA5A5";
  if (status === "ACTIVE") return "#A7F3D0";
  if (status === "PLAN_PENDING_PAYMENT") return "#FDE68A";
  if (status === "FIRM_REQUIRED") return "#93C5FD";
  return "#CBD5E1";
}

export default function SuperUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [firms, setFirms] = useState<FirmOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<UserCategory>("ALL");
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);

  const currentUser = useMemo(
    () => users.find((item) => item.id === editForm.id) ?? null,
    [users, editForm.id]
  );

  const counts = useMemo(() => {
    return {
      ALL: users.length,
      PLAN_REQUIRED: users.filter((u) => u.active && (u.onboardingStatus ?? "PLAN_REQUIRED") === "PLAN_REQUIRED").length,
      PLAN_PENDING_PAYMENT: users.filter((u) => u.active && u.onboardingStatus === "PLAN_PENDING_PAYMENT").length,
      FIRM_REQUIRED: users.filter((u) => u.active && u.onboardingStatus === "FIRM_REQUIRED").length,
      ACTIVE: users.filter((u) => u.active && u.onboardingStatus === "ACTIVE").length,
      INACTIVE: users.filter((u) => !u.active).length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((user) => {
      const status = user.onboardingStatus ?? "PLAN_REQUIRED";

      const categoryMatch =
        category === "ALL" ||
        (category === "INACTIVE" && !user.active) ||
        (category !== "INACTIVE" && user.active && status === category);

      if (!categoryMatch) return false;

      if (!q) return true;

      const haystack = [
        user.name || "",
        user.email || "",
        user.phone || "",
        user.firm?.name || "",
        user.selectedPlanNameSnapshot || "",
        status,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [users, search, category]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const me = await fetch("/api/me", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null);

        if (!ignore && me?.ok) {
          setUserName(me.user?.name || "SuperAdmin");
        }

        const [usersResponse, firmsResponse, plansResponse] = await Promise.all([
          fetch("/api/admin/super/users", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/admin/super/firms-list", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/admin/users/plans", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ]);

        if (!ignore) {
          setUsers(Array.isArray(usersResponse?.users) ? usersResponse.users : []);
          setFirms(Array.isArray(firmsResponse?.firms) ? firmsResponse.firms : []);
          setPlans(Array.isArray(plansResponse?.plans) ? plansResponse.plans : []);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  function openEditor(user: UserRow) {
    setMessage("");
    setEditForm({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "SECRETARY",
      active: Boolean(user.active),
      onboardingStatus: user.onboardingStatus ?? "PLAN_REQUIRED",
      selectedPlanId: user.selectedPlanId || "",
      firmId: user.firmId || "",
    });
  }

  async function reloadUsers() {
    const usersResponse = await fetch("/api/admin/super/users", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    setUsers(Array.isArray(usersResponse?.users) ? usersResponse.users : []);
  }

  async function saveUser() {
    if (!editForm.id || !editForm.name.trim() || !editForm.email.trim()) {
      setMessage("Preencha os campos obrigatórios.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/super/users/update", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...editForm,
          name: editForm.name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          selectedPlanId: editForm.role === "SUPERADMIN" ? "" : editForm.selectedPlanId,
          firmId: editForm.role === "SUPERADMIN" ? "" : editForm.firmId,
          onboardingStatus: editForm.role === "SUPERADMIN" ? null : editForm.onboardingStatus,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setMessage(data?.message || "Não foi possível atualizar o usuário.");
        return;
      }

      setMessage("Usuário atualizado com sucesso.");
      await reloadUsers();
    } catch {
      setMessage("Falha ao atualizar usuário.");
    } finally {
      setSaving(false);
    }
  }

  const categories: UserCategory[] = [
    "ALL",
    "PLAN_REQUIRED",
    "PLAN_PENDING_PAYMENT",
    "FIRM_REQUIRED",
    "ACTIVE",
    "INACTIVE",
  ];

  return (
    <SuperAdminShell userName={userName}>
      <div style={{ display: "grid", gap: 20 }}>
        <section className="jv-glass" style={{ padding: 22, borderRadius: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 950, color: "#F8FAFC", letterSpacing: "-0.04em" }}>
            Usuários
          </div>
          <div style={{ color: "#94A3B8", marginTop: 6, lineHeight: 1.7 }}>
            Gestão global de usuários do SaaS, separados por etapa da conta.
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className="jv-premium-card"
              style={{
                borderRadius: 20,
                padding: 16,
                textAlign: "left",
                cursor: "pointer",
                border:
                  category === item
                    ? "1px solid rgba(34,211,238,0.45)"
                    : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>
                {categoryLabel(item)}
              </div>
              <div style={{ color: "#F8FAFC", fontSize: 26, fontWeight: 950, marginTop: 6 }}>
                {counts[item]}
              </div>
            </button>
          ))}
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 1.2fr) minmax(360px, 0.8fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div className="jv-glass" style={{ padding: 16, borderRadius: 20, display: "grid", gap: 10 }}>
              <div style={{ color: "#F8FAFC", fontWeight: 800, fontSize: 16 }}>
                Buscar usuário
              </div>
              <input
                className="jv-premium-input"
                placeholder="Pesquisar por nome, e-mail, telefone, plano ou status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div style={{ color: "#94A3B8", fontSize: 13 }}>
                Categoria: {categoryLabel(category)} · Resultados: {filteredUsers.length}
              </div>
            </div>

            {loading ? (
              <div className="jv-glass" style={{ padding: 20, borderRadius: 20 }}>
                Carregando usuários...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="jv-glass" style={{ padding: 20, borderRadius: 20 }}>
                Nenhum usuário encontrado nesta categoria.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const currentStatus = user.onboardingStatus ?? "PLAN_REQUIRED";

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => openEditor(user)}
                    className="jv-glass"
                    style={{
                      padding: 20,
                      borderRadius: 20,
                      display: "grid",
                      gap: 8,
                      textAlign: "left",
                      border:
                        editForm.id === user.id
                          ? "1px solid rgba(99,102,241,0.45)"
                          : "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ color: "#F8FAFC", fontSize: 20, fontWeight: 800 }}>
                        {user.name}
                      </div>
                      <div style={{ color: statusColor(currentStatus, user.active), fontWeight: 900, fontSize: 12 }}>
                        {!user.active ? "INATIVO" : currentStatus}
                      </div>
                    </div>

                    <div style={{ color: "#94A3B8" }}>{user.email}</div>
                    <div style={{ color: "#94A3B8" }}>
                      Telefone: {user.phone || "Não informado"}
                    </div>
                    <div style={{ color: "#94A3B8" }}>
                      Plano: {user.selectedPlanNameSnapshot || "Nenhum"}
                    </div>
                    <div style={{ color: "#94A3B8" }}>
                      Advocacia: {user.firm?.name || "Nenhuma"}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="jv-glass" style={{ padding: 20, borderRadius: 20, display: "grid", gap: 14 }}>
            <div style={{ color: "#F8FAFC", fontSize: 22, fontWeight: 900 }}>
              {currentUser ? "Editar usuário" : "Selecione um usuário"}
            </div>

            {!currentUser ? (
              <div style={{ color: "#94A3B8" }}>
                Escolha um usuário na lista ao lado para editar.
              </div>
            ) : (
              <>
                <input
                  className="jv-premium-input"
                  placeholder="Nome"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                />

                <input
                  className="jv-premium-input"
                  placeholder="E-mail"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                />

                <input
                  className="jv-premium-input"
                  placeholder="Telefone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                />

                <select
                  className="jv-premium-input"
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      role: e.target.value,
                      onboardingStatus:
                        e.target.value === "SUPERADMIN" ? "" : prev.onboardingStatus || "PLAN_REQUIRED",
                      selectedPlanId: e.target.value === "SUPERADMIN" ? "" : prev.selectedPlanId,
                      firmId: e.target.value === "SUPERADMIN" ? "" : prev.firmId,
                    }))
                  }
                >
                  <option value="SECRETARY">SECRETARY</option>
                  <option value="MASTER">MASTER</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                </select>

                {editForm.role !== "SUPERADMIN" ? (
                  <>
                    <select
                      className="jv-premium-input"
                      value={editForm.selectedPlanId}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          selectedPlanId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Sem plano vinculado</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="jv-premium-input"
                      value={editForm.firmId}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          firmId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Sem advocacia vinculada</option>
                      {firms.map((firm) => (
                        <option key={firm.id} value={firm.id}>
                          {firm.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="jv-premium-input"
                      value={editForm.onboardingStatus}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          onboardingStatus: e.target.value,
                        }))
                      }
                    >
                      <option value="PLAN_REQUIRED">PLAN_REQUIRED</option>
                      <option value="PLAN_PENDING_PAYMENT">PLAN_PENDING_PAYMENT</option>
                      <option value="FIRM_REQUIRED">FIRM_REQUIRED</option>
                      <option value="ACTIVE">ACTIVE</option>
                    </select>
                  </>
                ) : null}

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#E2E8F0",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        active: e.target.checked,
                      }))
                    }
                  />
                  Usuário ativo
                </label>

                <div style={{ color: currentUser.emailVerified ? "#6EE7B7" : "#FCA5A5", fontWeight: 700 }}>
                  {currentUser.emailVerified ? "E-mail verificado" : "E-mail pendente"}
                </div>

                {message ? (
                  <div style={{ color: "#94A3B8", lineHeight: 1.7 }}>
                    {message}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="jv-premium-btn"
                  disabled={saving}
                  onClick={saveUser}
                >
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          div[style*="minmax(320px, 1.2fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </SuperAdminShell>
  );
}
