"use client";

import { useEffect, useMemo, useState } from "react";
import SuperAdminShell from "@/components/SuperAdminShell";

type UserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  document?: string | null;
  role: string;
  active: boolean;
  emailVerified?: boolean;
  onboardingStatus?: string | null;
  selectedPlanId?: string | null;
  selectedPlanNameSnapshot?: string | null;
  firmId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  firm?: {
    id: string;
    name: string;
    active?: boolean;
  } | null;
};

type FirmOption = {
  id: string;
  name: string;
  active: boolean;
};

type FormMode = "CREATE" | "EDIT";
type UserCategory = "ALL" | "ACTIVE" | "INACTIVE" | "MASTER" | "SECRETARY" | "SUPERADMIN";

type UserForm = {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  role: string;
  active: boolean;
  firmId: string;
  password: string;
};

const emptyForm: UserForm = {
  id: "",
  name: "",
  email: "",
  phone: "",
  document: "",
  role: "MASTER",
  active: true,
  firmId: "",
  password: "",
};

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function formatCpfCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

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

function roleLabel(role: string) {
  if (role === "MASTER") return "Advogado / Administrador";
  if (role === "SECRETARY") return "Secretário(a)";
  if (role === "SUPERADMIN") return "Admin Geral";
  return role;
}

function categoryLabel(category: UserCategory) {
  if (category === "ALL") return "Todos";
  if (category === "ACTIVE") return "Ativos";
  if (category === "INACTIVE") return "Inativos";
  if (category === "MASTER") return "Advogados";
  if (category === "SECRETARY") return "Secretários";
  if (category === "SUPERADMIN") return "Admins gerais";
  return category;
}

function statusText(user: UserRow) {
  if (!user.active) return "INATIVO";
  if (user.role === "SUPERADMIN") return "ADMIN GERAL";
  if (!user.firmId) return "SEM ADVOCACIA";
  return "LIBERADO";
}

function statusColor(user: UserRow) {
  if (!user.active) return "#FCA5A5";
  if (user.role === "SUPERADMIN") return "#C4B5FD";
  if (!user.firmId) return "#FDE68A";
  return "#A7F3D0";
}

export default function SuperUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [firms, setFirms] = useState<FirmOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<UserCategory>("ALL");
  const [formMode, setFormMode] = useState<FormMode>("CREATE");
  const [form, setForm] = useState<UserForm>(emptyForm);

  const currentUser = useMemo(
    () => users.find((item) => item.id === form.id) ?? null,
    [users, form.id]
  );

  const counts = useMemo(() => {
    return {
      ALL: users.length,
      ACTIVE: users.filter((u) => u.active).length,
      INACTIVE: users.filter((u) => !u.active).length,
      MASTER: users.filter((u) => u.role === "MASTER").length,
      SECRETARY: users.filter((u) => u.role === "SECRETARY").length,
      SUPERADMIN: users.filter((u) => u.role === "SUPERADMIN").length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((user) => {
      const categoryMatch =
        category === "ALL" ||
        (category === "ACTIVE" && user.active) ||
        (category === "INACTIVE" && !user.active) ||
        user.role === category;

      if (!categoryMatch) return false;

      if (!q) return true;

      const haystack = [
        user.name || "",
        user.email || "",
        user.phone || "",
        user.document || "",
        user.role || "",
        user.firm?.name || "",
        statusText(user),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [users, search, category]);

  const categories: UserCategory[] = [
    "ALL",
    "ACTIVE",
    "INACTIVE",
    "MASTER",
    "SECRETARY",
    "SUPERADMIN",
  ];

  async function loadData() {
    setLoading(true);

    try {
      const me = await fetch("/api/me", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);

      if (me?.ok) {
        setUserName(me.user?.name || "SuperAdmin");
      }

      const [usersResponse, firmsResponse] = await Promise.all([
        fetch("/api/admin/super/users", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null),
        fetch("/api/admin/super/firms-list", { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null),
      ]);

      setUsers(Array.isArray(usersResponse?.users) ? usersResponse.users : []);
      setFirms(Array.isArray(firmsResponse?.firms) ? firmsResponse.firms : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function showMessage(text: string, tone: "success" | "error" | "info" = "info") {
    setMessage(text);
    setMessageTone(tone);
  }

  function resetCreateForm() {
    setFormMode("CREATE");
    setForm(emptyForm);
    setMessage("");
  }

  function openEditor(user: UserRow) {
    setFormMode("EDIT");
    setMessage("");
    setForm({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      document: formatCpfCnpj(user.document || ""),
      role: user.role || "SECRETARY",
      active: Boolean(user.active),
      firmId: user.firmId || "",
      password: "",
    });
  }

  function updateForm<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      if (key === "role" && value === "SUPERADMIN") {
        next.firmId = "";
      }

      return next;
    });
  }

  async function saveUser() {
    if (!form.name.trim() || !form.email.trim()) {
      showMessage("Preencha nome e e-mail.", "error");
      return;
    }

    if (formMode === "CREATE" && !form.password.trim()) {
      showMessage("Informe uma senha inicial para criar o usuário.", "error");
      return;
    }

    if (form.password.trim() && form.password.trim().length < 6) {
      showMessage("A senha precisa ter pelo menos 6 caracteres.", "error");
      return;
    }

    if (form.role !== "SUPERADMIN" && !form.firmId) {
      showMessage("Vincule o usuário a uma advocacia para liberar o acesso.", "error");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const endpoint =
        formMode === "CREATE"
          ? "/api/admin/super/users/create"
          : "/api/admin/super/users/update";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: form.id,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          document: onlyDigits(form.document),
          password: form.password.trim(),
          role: form.role,
          active: form.active,
          firmId: form.role === "SUPERADMIN" ? "" : form.firmId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showMessage(data?.message || "Não foi possível salvar o usuário.", "error");
        return;
      }

      showMessage(data?.message || "Usuário salvo com sucesso.", "success");

      await loadData();

      if (formMode === "CREATE") {
        setForm({
          ...emptyForm,
          role: form.role,
          firmId: form.role === "SUPERADMIN" ? "" : form.firmId,
        });
      } else {
        setForm((prev) => ({
          ...prev,
          password: "",
        }));
      }
    } catch {
      showMessage("Falha ao salvar usuário.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrDeactivateUser() {
    if (!currentUser) {
      showMessage("Selecione um usuário primeiro.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Deseja excluir ou desativar a conta de ${currentUser.name}? Se houver vínculos no sistema, ela será apenas desativada.`
    );

    if (!confirmed) return;

    setRemoving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/super/users/delete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: currentUser.id,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showMessage(data?.message || "Não foi possível excluir/desativar.", "error");
        return;
      }

      showMessage(data?.message || "Operação realizada com sucesso.", "success");
      resetCreateForm();
      await loadData();
    } catch {
      showMessage("Falha ao excluir/desativar usuário.", "error");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <SuperAdminShell userName={userName}>
      <div className="jv-users-module">
        <style>{`
          .jv-users-module {
            display: grid;
            gap: 20px;
          }

          .jv-users-header {
            padding: 24px;
            border-radius: 24px;
          }

          .jv-users-title {
            color: #F8FAFC;
            font-size: 30px;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jv-users-subtitle {
            color: #94A3B8;
            margin-top: 6px;
            line-height: 1.7;
          }

          .jv-users-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
            gap: 12px;
          }

          .jv-users-category-card {
            border-radius: 20px;
            padding: 16px;
            text-align: left;
            cursor: pointer;
          }

          .jv-users-main-grid {
            display: grid;
            grid-template-columns: minmax(320px, 1.05fr) minmax(380px, 0.95fr);
            gap: 20px;
            align-items: start;
          }

          .jv-users-list {
            display: grid;
            gap: 16px;
          }

          .jv-users-search-card,
          .jv-users-editor {
            padding: 18px;
            border-radius: 20px;
            display: grid;
            gap: 12px;
          }

          .jv-users-item {
            padding: 18px;
            border-radius: 20px;
            display: grid;
            gap: 8px;
            text-align: left;
            cursor: pointer;
          }

          .jv-users-two {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .jv-users-editor-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
          }

          .jv-users-editor-title {
            color: #F8FAFC;
            font-size: 23px;
            font-weight: 950;
          }

          .jv-users-help {
            color: #94A3B8;
            font-size: 13px;
            line-height: 1.6;
          }

          .jv-users-label {
            color: #CBD5E1;
            font-size: 13px;
            font-weight: 800;
          }

          .jv-users-field {
            display: grid;
            gap: 6px;
          }

          .jv-users-check {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #E2E8F0;
            padding: 12px 14px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03);
          }

          .jv-users-message {
            padding: 12px 14px;
            border-radius: 14px;
            line-height: 1.6;
            font-size: 14px;
          }

          .jv-users-danger {
            border: 1px solid rgba(248,113,113,0.26);
            background: rgba(127,29,29,0.18);
            color: #FECACA;
          }

          .jv-users-success {
            border: 1px solid rgba(52,211,153,0.24);
            background: rgba(6,78,59,0.18);
            color: #A7F3D0;
          }

          .jv-users-info {
            border: 1px solid rgba(56,189,248,0.22);
            background: rgba(14,116,144,0.12);
            color: #BAE6FD;
          }

          .jv-users-actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .jv-users-delete-btn {
            width: 100%;
            border: 1px solid rgba(248,113,113,0.34);
            background: rgba(127,29,29,0.18);
            color: #FECACA;
            border-radius: 14px;
            padding: 13px 16px;
            font-weight: 900;
            cursor: pointer;
          }

          @media (max-width: 1000px) {
            .jv-users-main-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .jv-users-two {
              grid-template-columns: 1fr;
            }

            .jv-users-title {
              font-size: 25px;
            }
          }
        `}</style>

        <section className="jv-glass jv-users-header">
          <div className="jv-users-title">Usuários</div>
          <div className="jv-users-subtitle">
            Controle total das contas do sistema. Agora somente o Admin Geral cria, edita,
            vincula, ativa, desativa ou exclui usuários.
          </div>
        </section>

        <section className="jv-users-cards">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className="jv-premium-card jv-users-category-card"
              style={{
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

        <div className="jv-users-main-grid">
          <div className="jv-users-list">
            <div className="jv-glass jv-users-search-card">
              <div style={{ color: "#F8FAFC", fontWeight: 900, fontSize: 17 }}>
                Buscar usuário
              </div>

              <input
                className="jv-premium-input"
                placeholder="Pesquisar por nome, e-mail, telefone, CPF/CNPJ, advocacia ou função..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="jv-users-help">
                Categoria: {categoryLabel(category)} · Resultados: {filteredUsers.length}
              </div>

              <button type="button" className="jv-premium-btn" onClick={resetCreateForm}>
                Criar novo usuário
              </button>
            </div>

            {loading ? (
              <div className="jv-glass" style={{ padding: 20, borderRadius: 20 }}>
                Carregando usuários...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="jv-glass" style={{ padding: 20, borderRadius: 20 }}>
                Nenhum usuário encontrado.
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => openEditor(user)}
                  className="jv-glass jv-users-item"
                  style={{
                    border:
                      formMode === "EDIT" && form.id === user.id
                        ? "1px solid rgba(99,102,241,0.55)"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ color: "#F8FAFC", fontSize: 20, fontWeight: 900 }}>
                      {user.name}
                    </div>
                    <div style={{ color: statusColor(user), fontWeight: 950, fontSize: 12 }}>
                      {statusText(user)}
                    </div>
                  </div>

                  <div style={{ color: "#94A3B8" }}>{user.email}</div>
                  <div style={{ color: "#94A3B8" }}>
                    Telefone: {user.phone || "Não informado"}
                  </div>
                  <div style={{ color: "#94A3B8" }}>
                    CPF/CNPJ: {user.document ? formatCpfCnpj(user.document) : "Não informado"}
                  </div>
                  <div style={{ color: "#94A3B8" }}>
                    Função: {roleLabel(user.role)}
                  </div>
                  <div style={{ color: "#94A3B8" }}>
                    Advocacia: {user.firm?.name || "Nenhuma"}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="jv-glass jv-users-editor">
            <div className="jv-users-editor-title-row">
              <div className="jv-users-editor-title">
                {formMode === "CREATE" ? "Criar usuário" : "Editar usuário"}
              </div>

              {formMode === "EDIT" ? (
                <button
                  type="button"
                  className="jv-premium-card"
                  style={{ padding: "10px 12px", borderRadius: 14, color: "#CBD5E1" }}
                  onClick={resetCreateForm}
                >
                  Novo
                </button>
              ) : null}
            </div>

            <div className="jv-users-help">
              Usuários criados aqui já ficam com acesso controlado pelo Admin Geral.
              Para advogado ou secretário acessar o sistema, vincule a uma advocacia ativa.
            </div>

            <div className="jv-users-two">
              <div className="jv-users-field">
                <label className="jv-users-label">Nome completo</label>
                <input
                  className="jv-premium-input"
                  placeholder="Nome do usuário"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>

              <div className="jv-users-field">
                <label className="jv-users-label">E-mail</label>
                <input
                  className="jv-premium-input"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                />
              </div>
            </div>

            <div className="jv-users-two">
              <div className="jv-users-field">
                <label className="jv-users-label">Telefone</label>
                <input
                  className="jv-premium-input"
                  placeholder="Telefone"
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                />
              </div>

              <div className="jv-users-field">
                <label className="jv-users-label">CPF ou CNPJ</label>
                <input
                  className="jv-premium-input"
                  placeholder="CPF ou CNPJ"
                  value={form.document}
                  onChange={(e) => updateForm("document", formatCpfCnpj(e.target.value))}
                />
              </div>
            </div>

            <div className="jv-users-two">
              <div className="jv-users-field">
                <label className="jv-users-label">Função</label>
                <select
                  className="jv-premium-input"
                  value={form.role}
                  onChange={(e) => updateForm("role", e.target.value)}
                >
                  <option value="MASTER">Advogado / Administrador</option>
                  <option value="SECRETARY">Secretário(a)</option>
                  <option value="SUPERADMIN">Admin Geral</option>
                </select>
              </div>

              <div className="jv-users-field">
                <label className="jv-users-label">Advocacia vinculada</label>
                <select
                  className="jv-premium-input"
                  value={form.firmId}
                  disabled={form.role === "SUPERADMIN"}
                  onChange={(e) => updateForm("firmId", e.target.value)}
                >
                  <option value="">Selecione uma advocacia</option>
                  {firms.map((firm) => (
                    <option key={firm.id} value={firm.id}>
                      {firm.name} {firm.active ? "" : "(inativa)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="jv-users-field">
              <label className="jv-users-label">
                {formMode === "CREATE" ? "Senha inicial" : "Nova senha"}
              </label>
              <input
                className="jv-premium-input"
                type="password"
                placeholder={
                  formMode === "CREATE"
                    ? "Crie uma senha inicial"
                    : "Preencha somente se quiser trocar a senha"
                }
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
              />
            </div>

            <label className="jv-users-check">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateForm("active", e.target.checked)}
              />
              Usuário ativo
            </label>

            {formMode === "EDIT" && currentUser ? (
              <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: 13 }}>
                Status interno: {currentUser.onboardingStatus || "Sem onboarding"} ·
                E-mail: {currentUser.emailVerified ? " verificado" : " pendente"}
              </div>
            ) : null}

            {message ? (
              <div
                className={
                  messageTone === "success"
                    ? "jv-users-message jv-users-success"
                    : messageTone === "error"
                      ? "jv-users-message jv-users-danger"
                      : "jv-users-message jv-users-info"
                }
              >
                {message}
              </div>
            ) : null}

            <div className="jv-users-actions">
              <button
                type="button"
                className="jv-premium-btn"
                disabled={saving}
                onClick={saveUser}
              >
                {saving
                  ? "Salvando..."
                  : formMode === "CREATE"
                    ? "Criar usuário"
                    : "Salvar alterações"}
              </button>

              {formMode === "EDIT" && currentUser ? (
                <button
                  type="button"
                  className="jv-users-delete-btn"
                  disabled={removing}
                  onClick={deleteOrDeactivateUser}
                >
                  {removing ? "Processando..." : "Excluir ou desativar conta"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
