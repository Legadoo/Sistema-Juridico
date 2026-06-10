"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaEnvelope,
  FaIdBadge,
  FaLock,
  FaPhone,
  FaShieldHalved,
  FaUser,
  FaXmark,
} from "react-icons/fa6";
import AdminShell from "@/components/AdminShell";

type AccountPayload = {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    age?: number | null;
    role: string;
    active: boolean;
    onboardingStatus?: string | null;
    selectedPlanNameSnapshot?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  firm?: {
    id: string;
    name: string;
    slug: string;
    active: boolean;
  } | null;
};

type ApiResponse = {
  ok?: boolean;
  message?: string;
  account?: AccountPayload;
};

function roleLabel(role: string) {
  if (role === "MASTER") return "Advogado";
  if (role === "SECRETARY") return "Secretário(a)";
  if (role === "SUPERADMIN") return "Super Admin";
  return role;
}

function statusLabel(status?: string | null) {
  if (!status) return "ACTIVE";

  const map: Record<string, string> = {
    ACTIVE: "Ativo",
    PLAN_REQUIRED: "Plano pendente",
    FIRM_REQUIRED: "Escritório pendente",
    PLAN_PENDING_PAYMENT: "Pagamento pendente",
  };

  return map[status] || status;
}

function formatDate(value?: string) {
  if (!value) return "Não informado";

  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
  } catch {
    return "Não informado";
  }
}

function InfoCard({
  title,
  value,
  subtitle,
  Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  Icon: React.ComponentType;
  tone: "purple" | "blue" | "green";
}) {
  return (
    <article className={`jv-account-info-card jv-account-info-${tone}`}>
      <div className="jv-account-info-icon">
        <Icon />
      </div>

      <div>
        <div className="jv-account-info-title">{title}</div>
        <div className="jv-account-info-value">{value}</div>
        <div className="jv-account-info-subtitle">{subtitle}</div>
      </div>
    </article>
  );
}

export default function AdminAccountPage() {
  const [account, setAccount] = useState<AccountPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    age: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const user = account?.user;
  const firm = account?.firm;

  const initials = useMemo(() => {
    const name = user?.name || "Usuário";
    const parts = name.split(" ").filter(Boolean);

    if (parts.length === 0) return "JV";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user?.name]);

  function showMessage(text: string, tone: "success" | "error" | "info" = "info") {
    setMessage(text);
    setMessageTone(tone);
  }

  async function loadAccount() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/account", {
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !data?.ok || !data.account) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        showMessage(data?.message || "Não foi possível carregar sua conta.", "error");
        return;
      }

      setAccount(data.account);
      setProfileForm({
        name: data.account.user.name || "",
        age: data.account.user.age === null || data.account.user.age === undefined ? "" : String(data.account.user.age),
        phone: data.account.user.phone || "",
      });
    } catch {
      showMessage("Falha ao carregar sua conta.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccount();
  }, []);

  async function saveProfile() {
    if (!profileForm.name.trim()) {
      showMessage("O nome é obrigatório.", "error");
      return;
    }

    setSavingProfile(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: profileForm.name.trim(),
          age: profileForm.age,
          phone: profileForm.phone.trim(),
        }),
      });

      const data = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok || !data?.ok || !data.account) {
        showMessage(data?.message || "Não foi possível salvar sua conta.", "error");
        return;
      }

      setAccount(data.account);
      setProfileForm({
        name: data.account.user.name || "",
        age: data.account.user.age === null || data.account.user.age === undefined ? "" : String(data.account.user.age),
        phone: data.account.user.phone || "",
      });

      showMessage(data.message || "Conta atualizada com sucesso.", "success");
    } catch {
      showMessage("Falha ao salvar sua conta.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (!passwordForm.currentPassword) {
      showMessage("Informe sua senha atual.", "error");
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      showMessage("A nova senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage("A confirmação da nova senha não confere.", "error");
      return;
    }

    setSavingPassword(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/account/password", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(passwordForm),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showMessage(data?.message || "Não foi possível alterar sua senha.", "error");
        return;
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordModalOpen(false);
      showMessage(data.message || "Senha alterada com sucesso.", "success");
    } catch {
      showMessage("Falha ao alterar sua senha.", "error");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#07070a",
          color: "#F8FAFC",
        }}
      >
        Carregando conta...
      </div>
    );
  }

  return (
    <AdminShell
      userName={user.name || "Usuário"}
      role={user.role || "MASTER"}
      firmName={firm?.name || "Advocacia"}
    >
      <div className="jv-account-page">
        <style>{`
          .jv-account-page {
            display: grid;
            gap: 20px;
          }

          .jv-account-page * {
            box-sizing: border-box;
          }

          .jv-account-hero {
            min-height: 250px;
            position: relative;
            overflow: hidden;
            border-radius: 28px;
            border: 1px solid rgba(168, 85, 247, 0.22);
            background:
              linear-gradient(90deg, rgba(7, 10, 23, 0.96), rgba(12, 15, 31, 0.84), rgba(17, 24, 39, 0.72)),
              radial-gradient(circle at 82% 17%, rgba(124, 58, 237, 0.34), transparent 32%),
              linear-gradient(135deg, #090b16, #111827);
            box-shadow:
              0 34px 90px rgba(0,0,0,0.36),
              inset 0 1px 0 rgba(255,255,255,0.045);
            padding: 38px 42px;
          }

          .jv-account-hero::before {
            content: "";
            position: absolute;
            right: 70px;
            bottom: 20px;
            width: 340px;
            height: 190px;
            opacity: 0.42;
            background:
              radial-gradient(circle at 50% 44%, rgba(168,85,247,0.48), transparent 18%),
              linear-gradient(180deg, transparent 0 58px, rgba(168,85,247,0.58) 59px 62px, transparent 63px),
              linear-gradient(90deg, transparent 0 86px, rgba(192,132,252,0.40) 87px 89px, transparent 90px);
            clip-path: polygon(50% 0, 85% 22%, 80% 26%, 80% 34%, 20% 34%, 20% 26%, 15% 22%);
            filter: drop-shadow(0 0 34px rgba(168,85,247,0.38));
          }

          .jv-account-hero-content {
            position: relative;
            z-index: 2;
            max-width: 780px;
            display: grid;
            gap: 12px;
          }

          .jv-account-kicker {
            color: #c4b5fd;
            font-size: 12px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.10em;
          }

          .jv-account-title {
            margin: 0;
            color: #f8fafc;
            font-size: clamp(38px, 4vw, 56px);
            line-height: 0.98;
            font-weight: 950;
            letter-spacing: -0.06em;
          }

          .jv-account-text {
            margin: 0;
            color: #cbd5e1;
            font-size: 16px;
            line-height: 1.7;
          }

          .jv-account-info-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }

          .jv-account-info-card {
            min-height: 142px;
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: 17px;
            padding: 22px;
            border-radius: 23px;
            border: 1px solid rgba(148,163,184,0.16);
            background:
              radial-gradient(circle at 95% 5%, rgba(124,58,237,0.18), transparent 32%),
              linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.64));
            box-shadow: 0 26px 60px rgba(0,0,0,0.27);
          }

          .jv-account-info-icon {
            width: 66px;
            height: 66px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            font-size: 26px;
          }

          .jv-account-info-purple .jv-account-info-icon {
            color: #d8b4fe;
            background: radial-gradient(circle, rgba(168,85,247,0.45), rgba(15,23,42,0.72));
          }

          .jv-account-info-blue .jv-account-info-icon {
            color: #93c5fd;
            background: radial-gradient(circle, rgba(59,130,246,0.45), rgba(15,23,42,0.72));
          }

          .jv-account-info-green .jv-account-info-icon {
            color: #86efac;
            background: radial-gradient(circle, rgba(34,197,94,0.35), rgba(15,23,42,0.72));
          }

          .jv-account-info-title {
            color: #a1a1aa;
            font-size: 12px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jv-account-info-value {
            margin-top: 7px;
            color: #f8fafc;
            font-size: 18px;
            font-weight: 950;
            word-break: break-word;
          }

          .jv-account-info-subtitle {
            margin-top: 6px;
            color: #a1a1aa;
            font-size: 13px;
          }

          .jv-account-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.04fr) minmax(380px, 0.76fr);
            gap: 16px;
            align-items: start;
          }

          .jv-account-panel {
            border-radius: 24px;
            border: 1px solid rgba(168,85,247,0.22);
            background:
              radial-gradient(circle at 0% 0%, rgba(124,58,237,0.11), transparent 30%),
              linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.56));
            box-shadow: 0 28px 70px rgba(0,0,0,0.26);
            padding: 22px;
          }

          .jv-panel-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 18px;
          }

          .jv-panel-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0;
            color: #f8fafc;
            font-size: 22px;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jv-panel-title svg {
            color: #d8b4fe;
          }

          .jv-panel-subtitle {
            color: #a1a1aa;
            font-size: 14px;
            line-height: 1.6;
            margin-top: 6px;
          }

          .jv-account-form {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .jv-account-field {
            display: grid;
            gap: 7px;
          }

          .jv-account-field-full {
            grid-column: 1 / -1;
          }

          .jv-account-label {
            color: #cbd5e1;
            font-size: 13px;
            font-weight: 900;
          }

          .jv-account-input {
            width: 100%;
            min-height: 52px;
            border: 1px solid rgba(148,163,184,0.16);
            border-radius: 15px;
            background: rgba(15,23,42,0.62);
            color: #f8fafc;
            padding: 0 15px;
            outline: none;
            font-size: 15px;
          }

          .jv-account-input:focus {
            border-color: rgba(168,85,247,0.56);
            box-shadow: 0 0 0 3px rgba(168,85,247,0.10);
          }

          .jv-account-input[readonly] {
            color: #a1a1aa;
            background: rgba(15,23,42,0.38);
          }

          .jv-account-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 18px;
          }

          .jv-account-primary,
          .jv-account-secondary,
          .jv-account-danger {
            min-height: 48px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            border-radius: 15px;
            padding: 0 18px;
            border: 0;
            cursor: pointer;
            font-weight: 950;
          }

          .jv-account-primary {
            color: white;
            background: linear-gradient(135deg, #a855f7, #4f46e5);
            box-shadow: 0 18px 40px rgba(79,70,229,0.22);
          }

          .jv-account-secondary {
            color: #e5e7eb;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(148,163,184,0.15);
          }

          .jv-account-danger {
            color: #fecaca;
            background: rgba(127,29,29,0.20);
            border: 1px solid rgba(248,113,113,0.28);
          }

          .jv-account-security-list {
            display: grid;
            gap: 12px;
          }

          .jv-security-item {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 14px;
            align-items: center;
            padding: 15px;
            border-radius: 18px;
            border: 1px solid rgba(148,163,184,0.12);
            background: rgba(255,255,255,0.035);
          }

          .jv-security-icon {
            width: 54px;
            height: 54px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            color: #d8b4fe;
            background: rgba(168,85,247,0.18);
            font-size: 22px;
          }

          .jv-security-title {
            color: #f8fafc;
            font-weight: 950;
          }

          .jv-security-text {
            margin-top: 4px;
            color: #a1a1aa;
            font-size: 13px;
            line-height: 1.5;
          }

          .jv-account-message {
            padding: 13px 15px;
            border-radius: 15px;
            font-size: 14px;
            line-height: 1.6;
          }

          .jv-account-message-success {
            color: #a7f3d0;
            background: rgba(6,78,59,0.18);
            border: 1px solid rgba(52,211,153,0.22);
          }

          .jv-account-message-error {
            color: #fecaca;
            background: rgba(127,29,29,0.18);
            border: 1px solid rgba(248,113,113,0.24);
          }

          .jv-account-message-info {
            color: #bfdbfe;
            background: rgba(30,64,175,0.14);
            border: 1px solid rgba(96,165,250,0.20);
          }

          .jv-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 100;
            display: grid;
            place-items: center;
            padding: 18px;
            background: rgba(0,0,0,0.72);
            backdrop-filter: blur(8px);
          }

          .jv-password-modal {
            width: min(100%, 560px);
            border-radius: 26px;
            border: 1px solid rgba(168,85,247,0.26);
            background:
              radial-gradient(circle at 0% 0%, rgba(124,58,237,0.18), transparent 34%),
              linear-gradient(180deg, rgba(15,23,42,0.98), rgba(7,10,23,0.98));
            box-shadow: 0 38px 120px rgba(0,0,0,0.52);
            padding: 22px;
          }

          .jv-modal-head {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            align-items: flex-start;
            margin-bottom: 18px;
          }

          .jv-modal-title {
            display: flex;
            align-items: center;
            gap: 12px;
            color: #f8fafc;
            font-size: 23px;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jv-modal-title svg {
            color: #d8b4fe;
          }

          .jv-modal-close {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border-radius: 14px;
            color: #e5e7eb;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(148,163,184,0.16);
            cursor: pointer;
          }

          .jv-modal-form {
            display: grid;
            gap: 13px;
          }

          @media (max-width: 1200px) {
            .jv-account-info-grid,
            .jv-account-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .jv-account-hero {
              min-height: auto;
              padding: 28px 22px;
              border-radius: 24px;
            }

            .jv-account-hero::before {
              display: none;
            }

            .jv-account-title {
              font-size: 38px;
            }

            .jv-account-form {
              grid-template-columns: 1fr;
            }

            .jv-account-actions {
              flex-direction: column;
            }

            .jv-account-primary,
            .jv-account-secondary,
            .jv-account-danger {
              width: 100%;
            }

            .jv-panel-head {
              display: grid;
            }

            .jv-account-info-card {
              grid-template-columns: auto 1fr;
            }
          }
        `}</style>

        <section className="jv-account-hero">
          <div className="jv-account-hero-content">
            <div className="jv-account-kicker">Conta segura</div>

            <h1 className="jv-account-title">Minha conta</h1>

            <p className="jv-account-text">
              Gerencie os dados principais da sua conta, mantenha seu contato atualizado
              e proteja o acesso ao painel administrativo.
            </p>
          </div>
        </section>

        {message ? (
          <div
            className={
              messageTone === "success"
                ? "jv-account-message jv-account-message-success"
                : messageTone === "error"
                  ? "jv-account-message jv-account-message-error"
                  : "jv-account-message jv-account-message-info"
            }
          >
            {message}
          </div>
        ) : null}

        <section className="jv-account-info-grid">
          <InfoCard
            title="E-mail"
            value={user.email || "Não informado"}
            subtitle="Usado para login e identificação"
            Icon={FaEnvelope}
            tone="purple"
          />

          <InfoCard
            title="Plano"
            value={user.selectedPlanNameSnapshot || "Não informado"}
            subtitle={firm?.name || "Escritório vinculado"}
            Icon={FaIdBadge}
            tone="blue"
          />

          <InfoCard
            title="Status"
            value={statusLabel(user.onboardingStatus)}
            subtitle={user.active ? "Conta ativa no sistema" : "Conta desativada"}
            Icon={FaShieldHalved}
            tone="green"
          />
        </section>

        <section className="jv-account-grid">
          <div className="jv-account-panel">
            <div className="jv-panel-head">
              <div>
                <h2 className="jv-panel-title">
                  <FaUser />
                  Dados da conta
                </h2>
                <div className="jv-panel-subtitle">
                  Atualize suas informações pessoais usadas dentro do painel.
                </div>
              </div>
            </div>

            <div className="jv-account-form">
              <div className="jv-account-field jv-account-field-full">
                <label className="jv-account-label">E-mail</label>
                <input className="jv-account-input" value={user.email || ""} readOnly />
              </div>

              <div className="jv-account-field">
                <label className="jv-account-label">Nome</label>
                <input
                  className="jv-account-input"
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Seu nome"
                />
              </div>

              <div className="jv-account-field">
                <label className="jv-account-label">Idade</label>
                <input
                  className="jv-account-input"
                  type="number"
                  min="0"
                  max="130"
                  value={profileForm.age}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, age: event.target.value }))
                  }
                  placeholder="Sua idade"
                />
              </div>

              <div className="jv-account-field">
                <label className="jv-account-label">Telefone</label>
                <input
                  className="jv-account-input"
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="jv-account-field">
                <label className="jv-account-label">Função</label>
                <input className="jv-account-input" value={roleLabel(user.role)} readOnly />
              </div>
            </div>

            <div className="jv-account-actions">
              <button
                type="button"
                className="jv-account-primary"
                onClick={saveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Salvando..." : "Salvar dados"}
              </button>
            </div>
          </div>

          <div className="jv-account-panel">
            <div className="jv-panel-head">
              <div>
                <h2 className="jv-panel-title">
                  <FaLock />
                  Segurança
                </h2>
                <div className="jv-panel-subtitle">
                  A alteração de senha exige confirmação da senha atual.
                </div>
              </div>
            </div>

            <div className="jv-account-security-list">
              <div className="jv-security-item">
                <div className="jv-security-icon">
                  <FaShieldHalved />
                </div>

                <div>
                  <div className="jv-security-title">Proteção da conta</div>
                  <div className="jv-security-text">
                    Sua senha só pode ser alterada após validar a senha atual da sessão.
                  </div>
                </div>
              </div>

              <div className="jv-security-item">
                <div className="jv-security-icon">
                  <FaCalendarCheck />
                </div>

                <div>
                  <div className="jv-security-title">Cadastro</div>
                  <div className="jv-security-text">
                    Conta criada em {formatDate(user.createdAt)}.
                  </div>
                </div>
              </div>
            </div>

            <div className="jv-account-actions">
              <button
                type="button"
                className="jv-account-secondary"
                onClick={() => {
                  setPasswordModalOpen(true);
                  setMessage("");
                }}
              >
                <FaLock />
                Alterar senha
              </button>
            </div>
          </div>
        </section>

        {passwordModalOpen ? (
          <div className="jv-modal-backdrop">
            <div className="jv-password-modal">
              <div className="jv-modal-head">
                <div>
                  <div className="jv-modal-title">
                    <FaLock />
                    Confirmar alteração de senha
                  </div>

                  <div className="jv-panel-subtitle">
                    Para sua segurança, informe a senha atual antes de criar uma nova senha.
                  </div>
                </div>

                <button
                  type="button"
                  className="jv-modal-close"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setPasswordForm({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                  aria-label="Fechar"
                >
                  <FaXmark />
                </button>
              </div>

              <div className="jv-modal-form">
                <div className="jv-account-field">
                  <label className="jv-account-label">Senha atual</label>
                  <input
                    className="jv-account-input"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: event.target.value,
                      }))
                    }
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="jv-account-field">
                  <label className="jv-account-label">Nova senha</label>
                  <input
                    className="jv-account-input"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                    placeholder="Digite a nova senha"
                  />
                </div>

                <div className="jv-account-field">
                  <label className="jv-account-label">Confirmar nova senha</label>
                  <input
                    className="jv-account-input"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                    placeholder="Repita a nova senha"
                  />
                </div>

                <div className="jv-account-actions">
                  <button
                    type="button"
                    className="jv-account-primary"
                    onClick={changePassword}
                    disabled={savingPassword}
                  >
                    {savingPassword ? "Alterando..." : "Confirmar nova senha"}
                  </button>

                  <button
                    type="button"
                    className="jv-account-secondary"
                    onClick={() => {
                      setPasswordModalOpen(false);
                      setPasswordForm({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}