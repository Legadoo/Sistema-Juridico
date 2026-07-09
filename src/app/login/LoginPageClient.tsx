"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaArrowRightToBracket,
  FaChartSimple,
  FaClock,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaFolderOpen,
  FaHouse,
  FaLock,
  FaShieldHalved,
  FaUserGroup,
} from "react-icons/fa6";

type MeResponse = {
  ok?: boolean;
  suggestedRedirect?: string;
  user?: {
    role?: string;
    onboardingStatus?: string;
    firmId?: string | null;
    canAccessAdmin?: boolean;
  };
};

const featureCards = [
  {
    title: "Área do cliente",
    text: "Acompanhe e gerencie seus clientes com eficiência.",
    Icon: FaUserGroup,
  },
  {
    title: "Controle de prazos",
    text: "Nunca mais perca prazos. Alertas e organização total.",
    Icon: FaClock,
  },
  {
    title: "Histórico processual",
    text: "Tenha todo o histórico dos processos na palma.",
    Icon: FaFolderOpen,
  },
  {
    title: "Painel premium",
    text: "Dashboard avançado com métricas e indicadores.",
    Icon: FaShieldHalved,
  },
];

export default function LoginPageClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");

    if (verified === "invalid") {
      setMsg("Link de verificação inválido.");
    }

    if (verified === "expired") {
      setMsg("Seu link de verificação expirou.");
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as MeResponse | null;

        if (!ignore && response.ok && data?.ok && data.user) {
          setMsg("Sessão ativa detectada. Você pode continuar entrando com outra conta.");
        }
      } catch {
        // sem sessão ativa
      } finally {
        if (!ignore) {
          setCheckingSession(false);
        }
      }
    }

    void checkSession();

    return () => {
      ignore = true;
    };
  }, []);

  function fillDemo() {
    setEmail("demoadv@demo.com");
    setPassword("demo123");
    setMsg("Credenciais demo preenchidas. Clique em Entrar no JuridicVas.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg(data?.message || "Credenciais inválidas.");
        setLoading(false);
        return;
      }

      window.location.href = data?.redirectTo || "/admin";
      router.refresh();
    } catch {
      setMsg("Não foi possível entrar agora.");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="jv-login-loading">
        <style>{`
          .jv-login-loading {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background:
              radial-gradient(circle at top right, rgba(22,119,255,.26), transparent 30%),
              linear-gradient(180deg, #020617 0%, #07111f 100%);
            color: #e2e8f0;
            font-family: Arial, Helvetica, sans-serif;
          }
        `}</style>
        Verificando acesso...
      </main>
    );
  }

  return (
    <main className="jv-login-page">
      <style>{`
        :root {
          --jv-blue: #1677ff;
          --jv-cyan: #0ea5e9;
          --jv-text: #f8fafc;
          --jv-muted: #94a3b8;
          --jv-border: rgba(148, 163, 184, 0.20);
        }

        .jv-login-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: var(--jv-text);
          font-family: Arial, Helvetica, sans-serif;
          background:
            radial-gradient(circle at 83% 8%, rgba(22,119,255,.35), transparent 28%),
            radial-gradient(circle at 8% 92%, rgba(22,119,255,.35), transparent 24%),
            linear-gradient(135deg, #020617 0%, #07111f 42%, #050a18 100%);
        }

        .jv-login-page * {
          box-sizing: border-box;
        }

        .jv-login-page::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .35;
          background:
            linear-gradient(115deg, transparent 0%, rgba(22,119,255,.08) 52%, transparent 78%),
            radial-gradient(circle at 86% 30%, rgba(14,165,233,.24), transparent 1px),
            radial-gradient(circle at 14% 80%, rgba(22,119,255,.50), transparent 2px);
        }

        .jv-login-page::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(56,189,248,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,.035) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(to bottom, black, transparent 80%);
        }

        .jv-orbit {
          position: absolute;
          width: 620px;
          height: 620px;
          border: 1px solid rgba(22,119,255,.20);
          border-radius: 999px;
          right: -170px;
          top: 120px;
          pointer-events: none;
        }

        .jv-orbit::before {
          content: "";
          position: absolute;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #1677ff;
          box-shadow: 0 0 24px #1677ff;
          top: 95px;
          right: 120px;
        }

        .jv-court-bg {
          position: absolute;
          left: 0;
          top: 22%;
          width: 42%;
          height: 56%;
          opacity: .10;
          background:
            linear-gradient(90deg, rgba(148,163,184,.16), transparent),
            repeating-linear-gradient(90deg, transparent 0 34px, rgba(148,163,184,.18) 35px 38px, transparent 39px 72px);
          clip-path: polygon(0 0, 80% 10%, 100% 100%, 0 100%);
          pointer-events: none;
        }

        .jv-login-shell {
          position: relative;
          z-index: 2;
          width: min(1240px, calc(100% - 40px));
          min-height: 100vh;
          margin: 0 auto;
          padding: 54px 0;
          display: grid;
          grid-template-columns: 1fr 0.92fr;
          gap: 70px;
          align-items: center;
        }

        .jv-brand-logo {
          width: 290px;
          height: auto;
          display: block;
          margin-bottom: 64px;
        }

        .jv-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid rgba(56,189,248,.36);
          background: rgba(14,165,233,.09);
          color: #38bdf8;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .jv-login-content h1 {
          max-width: 700px;
          margin: 28px 0 0;
          font-size: clamp(42px, 5vw, 64px);
          line-height: 1.06;
          letter-spacing: -0.065em;
          font-weight: 950;
        }

        .jv-login-content h1 span {
          color: #1677ff;
        }

        .jv-login-content p {
          max-width: 620px;
          margin: 24px 0 0;
          color: #cbd5e1;
          font-size: 18px;
          line-height: 1.75;
        }

        .jv-feature-grid {
          max-width: 700px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-top: 34px;
        }

        .jv-feature-card {
          min-height: 116px;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: center;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(15,23,42,.50);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
        }

        .jv-feature-icon,
        .jv-login-lock {
          display: grid;
          place-items: center;
          color: #dbeafe;
          background: linear-gradient(135deg, rgba(22,119,255,.95), rgba(14,165,233,.52));
          box-shadow: 0 18px 44px rgba(22,119,255,.22);
        }

        .jv-feature-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          font-size: 23px;
        }

        .jv-feature-card strong {
          display: block;
          margin-bottom: 6px;
          color: white;
          font-size: 15px;
        }

        .jv-feature-card span {
          display: block;
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.5;
        }

        .jv-login-card {
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: 540px;
          justify-self: end;
          padding: 42px;
          border-radius: 32px;
          border: 1px solid rgba(56,189,248,.30);
          background:
            radial-gradient(circle at 90% 5%, rgba(22,119,255,.24), transparent 22%),
            linear-gradient(180deg, rgba(5,12,28,.92), rgba(3,7,18,.86));
          box-shadow:
            0 40px 110px rgba(0,0,0,.55),
            0 0 0 1px rgba(255,255,255,.04) inset,
            0 0 70px rgba(22,119,255,.14);
          backdrop-filter: blur(18px);
        }

        .jv-login-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(135deg, rgba(255,255,255,.08), transparent 35%);
        }

        .jv-login-card-inner {
          position: relative;
          z-index: 1;
        }

        .jv-login-head {
          display: grid;
          place-items: center;
          text-align: center;
          margin-bottom: 28px;
        }

        .jv-login-lock {
          width: 70px;
          height: 70px;
          border-radius: 999px;
          border: 1px solid rgba(56,189,248,.24);
          background: rgba(15,23,42,.60);
          color: #38bdf8;
          font-size: 26px;
          margin-bottom: 18px;
        }

        .jv-login-head h2 {
          margin: 0;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: -0.04em;
        }

        .jv-login-head p {
          margin: 10px 0 0;
          color: #93c5fd;
          font-size: 15px;
        }

        .jv-divider-line {
          height: 1px;
          width: 100%;
          margin: 24px 0;
          background: linear-gradient(90deg, transparent, rgba(148,163,184,.20), transparent);
        }

        .jv-form {
          display: grid;
          gap: 18px;
        }

        .jv-field {
          display: grid;
          gap: 8px;
        }

        .jv-field label {
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 800;
        }

        .jv-input-wrap {
          min-height: 58px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.22);
          background: rgba(15,23,42,.72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
        }

        .jv-input-wrap svg {
          color: #b6c4d8;
          font-size: 20px;
        }

        .jv-input-wrap input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          color: white;
          background: transparent;
          font-size: 15px;
        }

        .jv-input-wrap input::placeholder {
          color: #94a3b8;
        }

        .jv-password-toggle {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: #cbd5e1;
          cursor: pointer;
        }

        .jv-forgot {
          display: inline-flex;
          justify-self: end;
          margin-top: -6px;
          color: #22d3ee;
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
        }

        .jv-primary-button,
        .jv-secondary-button {
          width: 100%;
          min-height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          transition: transform .2s ease, opacity .2s ease, border-color .2s ease;
        }

        .jv-primary-button {
          border: 0;
          color: white;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
          box-shadow: 0 22px 50px rgba(22,119,255,.30);
        }

        .jv-secondary-button {
          color: #dbeafe;
          text-decoration: none;
          border: 1px solid rgba(148,163,184,.20);
          background: rgba(15,23,42,.62);
        }

        .jv-primary-button:hover,
        .jv-secondary-button:hover {
          transform: translateY(-2px);
        }

        .jv-primary-button:disabled,
        .jv-secondary-button:disabled {
          opacity: .58;
          cursor: not-allowed;
          transform: none;
        }

        .jv-or-separator {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          margin: 8px 0 2px;
          color: #64748b;
          font-size: 13px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .jv-or-separator::before,
        .jv-or-separator::after {
          content: "";
          height: 1px;
          background: rgba(148,163,184,.18);
        }

        .jv-message {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(56,189,248,.22);
          background: rgba(14,165,233,.08);
          color: #bae6fd;
          font-size: 14px;
          line-height: 1.6;
        }

        .jv-restricted-note {
          margin-top: 22px;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 14px;
          align-items: center;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid rgba(56,189,248,.18);
          background: rgba(15,23,42,.54);
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.55;
        }

        .jv-restricted-note svg {
          color: #22d3ee;
          font-size: 26px;
        }

        @media (max-width: 1024px) {
          .jv-login-shell {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 40px 0;
          }

          .jv-login-card {
            max-width: 680px;
            justify-self: center;
            order: 2;
          }

          .jv-login-content {
            text-align: center;
            order: 1;
          }

          .jv-brand-logo {
            margin: 0 auto 30px;
          }

          .jv-login-content h1,
          .jv-login-content p {
            margin-left: auto;
            margin-right: auto;
          }

          .jv-feature-grid {
            margin-left: auto;
            margin-right: auto;
          }
        }

        @media (max-width: 640px) {
          .jv-login-page {
            background:
              radial-gradient(circle at 82% 8%, rgba(22,119,255,.35), transparent 26%),
              radial-gradient(circle at 5% 46%, rgba(22,119,255,.22), transparent 22%),
              linear-gradient(180deg, #020617 0%, #07111f 100%);
          }

          .jv-orbit {
            width: 380px;
            height: 380px;
            right: -220px;
            top: 80px;
          }

          .jv-court-bg {
            width: 100%;
            height: 36%;
            top: 8%;
            opacity: .08;
          }

          .jv-login-shell {
            width: min(100% - 28px, 1240px);
            min-height: auto;
            padding: 28px 0 36px;
            gap: 22px;
          }

          .jv-login-content {
            text-align: center;
          }

          .jv-brand-logo {
            width: 220px;
            margin-bottom: 24px;
          }

          .jv-kicker {
            font-size: 11px;
            padding: 8px 12px;
          }

          .jv-login-content h1 {
            margin-top: 22px;
            font-size: 36px;
            line-height: 1.12;
            letter-spacing: -0.05em;
          }

          .jv-login-content p {
            margin-top: 18px;
            font-size: 16px;
            line-height: 1.65;
          }

          .jv-feature-grid {
            display: none;
          }

          .jv-login-card {
            order: 2;
            max-width: 100%;
            padding: 24px;
            border-radius: 24px;
          }

          .jv-login-head {
            display: none;
          }

          .jv-divider-line {
            margin: 4px 0 8px;
          }

          .jv-field label {
            font-size: 14px;
          }

          .jv-input-wrap {
            min-height: 58px;
          }

          .jv-primary-button,
          .jv-secondary-button {
            min-height: 58px;
            font-size: 15px;
          }

          .jv-restricted-note {
            grid-template-columns: auto 1fr;
            align-items: start;
            font-size: 13px;
          }
        }

        @media (max-width: 380px) {
          .jv-brand-logo {
            width: 200px;
          }

          .jv-login-content h1 {
            font-size: 32px;
          }

          .jv-login-card {
            padding: 20px;
          }
        }
      `}</style>

      <div className="jv-orbit" />
      <div className="jv-court-bg" />

      <div className="jv-login-shell">
        <section className="jv-login-content">
          <img className="jv-brand-logo" src="/brand/logo-juridicvas.svg" alt="JuridicVas" />

          <div className="jv-kicker">Plataforma jurídica inteligente</div>

          <h1>
            Gestão jurídica com presença, organização e <span>controle real.</span>
          </h1>

          <p>
            Centralize clientes, processos, prazos e documentos em um sistema profissional,
            seguro e feito para a rotina do advogado moderno.
          </p>

          <div className="jv-feature-grid">
            {featureCards.map((card) => {
              const Icon = card.Icon;

              return (
                <article className="jv-feature-card" key={card.title}>
                  <div className="jv-feature-icon">
                    <Icon />
                  </div>
                  <div>
                    <strong>{card.title}</strong>
                    <span>{card.text}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="jv-login-card">
          <div className="jv-login-card-inner">
            <div className="jv-login-head">
              <div className="jv-login-lock">
                <FaLock />
              </div>

              <h2>Entrar no sistema</h2>
              <p>Acesse sua conta com segurança.</p>
            </div>

            <div className="jv-divider-line" />

            <form onSubmit={onSubmit} className="jv-form">
              <div className="jv-field">
                <label htmlFor="email">E-mail</label>
                <div className="jv-input-wrap">
                  <FaEnvelope />
                  <input
                    id="email"
                    type="email"
                    placeholder="Digite seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <span />
                </div>
              </div>

              <div className="jv-field">
                <label htmlFor="password">Senha</label>
                <div className="jv-input-wrap">
                  <FaLock />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="jv-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <a href="#" className="jv-forgot">
                Esqueceu sua senha?
              </a>

              {msg ? <div className="jv-message">{msg}</div> : null}

              <button type="submit" className="jv-primary-button" disabled={loading}>
                <FaArrowRightToBracket />
                {loading ? "Entrando..." : "Entrar no JuridicVas"}
              </button>

              <div className="jv-or-separator">ou</div>

              <button
                type="button"
                className="jv-secondary-button"
                onClick={fillDemo}
                disabled={loading}
              >
                <FaChartSimple />
                Preencher modo demo
              </button>

              <a className="jv-secondary-button" href="/">
                <FaHouse />
                Voltar para página principal
              </a>
            </form>

            <div className="jv-restricted-note">
              <FaShieldHalved />
              <div>
                <strong>Ambiente restrito para equipe interna do escritório.</strong>
                <br />
                Login somente para usuários com conta cadastrada.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
