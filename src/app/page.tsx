import {
  FaArrowRight,
  FaBars,
  FaBriefcase,
  FaBuildingColumns,
  FaChartLine,
  FaCheck,
  FaCirclePlay,
  FaFileLines,
  FaFolderOpen,
  FaGaugeHigh,
  FaLandmark,
  FaLock,
  FaRegCalendarCheck,
  FaScaleBalanced,
  FaShieldHalved,
  FaUserCheck,
  FaUserShield,
  FaUsers,
} from "react-icons/fa6";
import { getPublicSiteData } from "@/services/public-site/site";

const benefits = [
  {
    title: "Controle total",
    text: "Acompanhe processos, prazos, responsáveis e movimentações em tempo real.",
    Icon: FaShieldHalved,
  },
  {
    title: "Documentos organizados",
    text: "Centralize pareceres, manifestações, contratos, ofícios e despachos.",
    Icon: FaFolderOpen,
  },
  {
    title: "Permissões por usuário",
    text: "Defina níveis de acesso conforme a função de cada membro da equipe.",
    Icon: FaUserShield,
  },
  {
    title: "Relatórios estratégicos",
    text: "Visualize indicadores e acompanhe a produtividade da operação jurídica.",
    Icon: FaChartLine,
  },
];

const modules = [
  { title: "Dashboard", Icon: FaGaugeHigh },
  { title: "Processos", Icon: FaFolderOpen },
  { title: "Clientes", Icon: FaUsers },
  { title: "Documentos", Icon: FaFileLines },
  { title: "Usuários", Icon: FaUserCheck },
  { title: "Relatórios", Icon: FaChartLine },
];

const audiences = [
  { title: "Escritórios de advocacia", Icon: FaScaleBalanced },
  { title: "Assessorias jurídicas", Icon: FaBriefcase },
  { title: "Procuradorias", Icon: FaLandmark },
  { title: "Secretarias públicas", Icon: FaBuildingColumns },
  { title: "Departamentos administrativos", Icon: FaUsers },
];

export default async function HomePage() {
  const siteData = await getPublicSiteData();
  const config = siteData.config;

  const heroSlides = siteData.media.filter(
    (item) => item.section === "hero" && item.type === "image" && item.isActive && item.url
  );

  const heroTitle =
    config.heroTitle ||
    "Gestão jurídica premium para escritórios que querem crescer com organização.";

  const heroSubtitle =
    config.heroSubtitle ||
    "Centralize clientes, processos, prazos, agendamentos e cobranças em uma plataforma moderna, profissional e acessível.";

  return (
    <main className="jv-landing">
      <style>{`
        :root {
          --jv-bg: #030712;
          --jv-card: rgba(15, 23, 42, 0.72);
          --jv-border: rgba(148, 163, 184, 0.18);
          --jv-blue: #1677ff;
          --jv-blue-2: #38bdf8;
          --jv-text: #f8fafc;
          --jv-muted: #94a3b8;
        }

        .jv-landing {
          min-height: 100vh;
          color: var(--jv-text);
          background:
            radial-gradient(circle at 78% 8%, rgba(22, 119, 255, 0.32), transparent 28%),
            radial-gradient(circle at 15% 18%, rgba(14, 165, 233, 0.15), transparent 22%),
            linear-gradient(180deg, #020617 0%, #07111f 48%, #020617 100%);
          overflow-x: hidden;
          font-family: Arial, Helvetica, sans-serif;
        }

        .jv-landing * {
          box-sizing: border-box;
        }

        .jv-hero-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }

        .jv-hero-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(2,6,23,0.96) 0%, rgba(2,6,23,0.72) 42%, rgba(2,6,23,0.88) 100%),
            radial-gradient(circle at 78% 22%, rgba(22,119,255,0.30), transparent 34%),
            linear-gradient(180deg, rgba(2,6,23,0.25), rgba(2,6,23,0.94));
        }

        .jv-hero-slide {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transform: scale(1.04);
          animation-name: jvHeroFade;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .jv-hero-slide-single {
          opacity: 1;
          animation: none;
        }

        @keyframes jvHeroFade {
          0% { opacity: 0; transform: scale(1.04); }
          8% { opacity: 1; transform: scale(1.02); }
          34% { opacity: 1; transform: scale(1); }
          44% { opacity: 0; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }

        .jv-noise {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.34;
          background-image:
            linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(to bottom, black, transparent 78%);
          z-index: 1;
        }

        .jv-header {
          position: sticky;
          top: 0;
          z-index: 20;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          background: rgba(2, 6, 23, 0.82);
          backdrop-filter: blur(18px);
        }

        .jv-container {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .jv-header-inner {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .jv-logo {
          width: 220px;
          height: auto;
          display: block;
        }

        .jv-nav {
          display: flex;
          align-items: center;
          gap: 28px;
          font-size: 14px;
          font-weight: 700;
        }

        .jv-nav a {
          color: #e2e8f0;
          text-decoration: none;
          transition: color .2s ease;
        }

        .jv-nav a:hover {
          color: #38bdf8;
        }

        .jv-login-button,
        .jv-primary-button,
        .jv-secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 48px;
          padding: 0 22px;
          border-radius: 12px;
          font-weight: 800;
          text-decoration: none;
          transition: transform .2s ease, border-color .2s ease, background .2s ease;
        }

        .jv-login-button,
        .jv-primary-button {
          color: white;
          background: linear-gradient(135deg, #1677ff, #0057ff);
          box-shadow: 0 16px 40px rgba(22, 119, 255, 0.26);
        }

        .jv-secondary-button {
          color: white;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(15, 23, 42, 0.55);
        }

        .jv-login-button:hover,
        .jv-primary-button:hover,
        .jv-secondary-button:hover {
          transform: translateY(-2px);
        }

        .jv-menu {
          display: none;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: white;
          font-size: 22px;
          place-items: center;
        }

        .jv-hero {
          position: relative;
          min-height: 760px;
          padding: 90px 0 80px;
          overflow: hidden;
        }

        .jv-hero-grid {
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          align-items: center;
          gap: 54px;
          min-height: 590px;
        }

        .jv-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          padding: 8px 13px;
          border-radius: 999px;
          border: 1px solid rgba(56,189,248,0.32);
          color: #38bdf8;
          background: rgba(14,165,233,0.10);
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .02em;
          text-transform: uppercase;
        }

        .jv-hero h1 {
          margin: 0;
          max-width: 760px;
          font-size: clamp(42px, 5.2vw, 68px);
          line-height: .96;
          letter-spacing: -0.07em;
          font-weight: 950;
        }

        .jv-hero h1 span {
          color: #38bdf8;
        }

        .jv-hero p {
          max-width: 660px;
          margin: 24px 0 0;
          color: #cbd5e1;
          font-size: 18px;
          line-height: 1.75;
        }

        .jv-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          margin-top: 34px;
        }

        .jv-trust {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 42px;
          max-width: 650px;
        }

        .jv-trust-card,
        .jv-benefit,
        .jv-module-card,
        .jv-audience-card,
        .jv-preview {
          border: 1px solid var(--jv-border);
          background: rgba(15, 23, 42, 0.60);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(14px);
        }

        .jv-trust-card {
          padding: 16px;
          border-radius: 18px;
        }

        .jv-trust-card strong {
          display: block;
          color: white;
          font-size: 22px;
          margin-bottom: 4px;
        }

        .jv-trust-card span {
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.45;
        }

        .jv-preview {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          padding: 22px;
          min-height: 440px;
          box-shadow: 0 30px 90px rgba(0,0,0,0.45);
        }

        .jv-preview-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
        }

        .jv-preview-dots {
          display: flex;
          gap: 7px;
        }

        .jv-preview-dots span {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: rgba(148,163,184,0.45);
        }

        .jv-preview-panel {
          display: grid;
          gap: 14px;
        }

        .jv-preview-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border-radius: 18px;
          background: rgba(2,6,23,0.56);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .jv-icon-box {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: white;
          background: linear-gradient(135deg, #1677ff, #0ea5e9);
          box-shadow: 0 18px 40px rgba(22,119,255,0.24);
        }

        .jv-section {
          position: relative;
          z-index: 2;
          padding: 80px 0;
        }

        .jv-section-title {
          max-width: 760px;
          margin-bottom: 34px;
        }

        .jv-section-title h2 {
          margin: 0;
          color: white;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.05;
          letter-spacing: -0.06em;
        }

        .jv-section-title p {
          color: #94a3b8;
          font-size: 17px;
          line-height: 1.7;
          margin: 14px 0 0;
        }

        .jv-benefits {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .jv-benefit,
        .jv-module-card,
        .jv-audience-card {
          border-radius: 22px;
          padding: 22px;
        }

        .jv-benefit h3,
        .jv-module-card h3,
        .jv-audience-card h3 {
          margin: 16px 0 0;
          color: white;
        }

        .jv-benefit p {
          margin: 10px 0 0;
          color: #94a3b8;
          line-height: 1.6;
          font-size: 14px;
        }

        .jv-modules,
        .jv-audiences {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .jv-module-card,
        .jv-audience-card {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .jv-module-card h3,
        .jv-audience-card h3 {
          margin: 0;
        }

        .jv-cta {
          position: relative;
          overflow: hidden;
          border-radius: 32px;
          padding: 46px;
          border: 1px solid rgba(56,189,248,0.24);
          background:
            radial-gradient(circle at 85% 20%, rgba(22,119,255,0.30), transparent 30%),
            linear-gradient(135deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95));
          box-shadow: 0 32px 80px rgba(0,0,0,0.40);
        }

        .jv-cta h2 {
          margin: 0;
          font-size: clamp(32px, 4vw, 52px);
          line-height: 1.05;
          letter-spacing: -0.06em;
        }

        .jv-cta p {
          max-width: 760px;
          color: #cbd5e1;
          line-height: 1.7;
          font-size: 17px;
        }

        .jv-footer {
          position: relative;
          z-index: 2;
          padding: 28px 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          color: #94a3b8;
        }

        @media (max-width: 980px) {
          .jv-nav,
          .jv-login-button {
            display: none;
          }

          .jv-menu {
            display: grid;
          }

          .jv-hero {
            min-height: auto;
            padding: 70px 0;
          }

          .jv-hero-grid {
            grid-template-columns: 1fr;
            min-height: auto;
          }

          .jv-preview {
            min-height: 360px;
          }

          .jv-benefits,
          .jv-modules,
          .jv-audiences {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 640px) {
          .jv-container {
            width: min(100% - 28px, 1180px);
          }

          .jv-logo {
            width: 185px;
          }

          .jv-hero {
            padding: 52px 0;
          }

          .jv-hero h1 {
            font-size: 40px;
          }

          .jv-hero p {
            font-size: 16px;
          }

          .jv-trust,
          .jv-benefits,
          .jv-modules,
          .jv-audiences {
            grid-template-columns: 1fr;
          }

          .jv-preview {
            display: none;
          }

          .jv-cta {
            padding: 28px;
          }
        }
      `}</style>

      <div className="jv-noise" />

      <header className="jv-header">
        <div className="jv-container jv-header-inner">
          <a href="/">
            <img className="jv-logo" src="/brand/logo-juridicvas.svg" alt="JuridicVas" />
          </a>

          <nav className="jv-nav">
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#modulos">Módulos</a>
            <a href="#publico">Para quem é</a>
            <a href="/acompanhar">Acompanhar processo</a>
          </nav>

          <a className="jv-login-button" href="/login">
            <FaLock />
            Entrar
          </a>

          <button className="jv-menu" aria-label="Menu">
            <FaBars />
          </button>
        </div>
      </header>

      <section className="jv-hero">
        <div className="jv-hero-bg">
          {heroSlides.length ? (
            heroSlides.map((slide, index) => {
              const duration = Math.max(heroSlides.length * 6, 12);

              return (
                <div
                  key={slide.id}
                  className={heroSlides.length === 1 ? "jv-hero-slide jv-hero-slide-single" : "jv-hero-slide"}
                  style={{
                    backgroundImage: `url(${slide.url})`,
                    animationDuration: `${duration}s`,
                    animationDelay: `${index * 6}s`,
                  }}
                />
              );
            })
          ) : null}
        </div>

        <div className="jv-container jv-hero-grid">
          <div>
            <div className="jv-kicker">
              <FaShieldHalved />
              Plataforma jurídica inteligente
            </div>

            <h1>
              {heroTitle} <span></span>
            </h1>

            <p>{heroSubtitle}</p>

            <div className="jv-hero-actions">
              <a className="jv-primary-button" href={config.loginUrl || "/login"}>
                {config.heroPrimaryButtonText || "Entrar"}
                <FaArrowRight />
              </a>

              <a className="jv-secondary-button" href={config.trackUrl || "/acompanhar"}>
                <FaCirclePlay />
                {config.heroSecondaryButtonText || "Acompanhar"}
              </a>
            </div>

            <div className="jv-trust">
              <div className="jv-trust-card">
                <strong>100%</strong>
                <span>controle visual da operação</span>
              </div>

              <div className="jv-trust-card">
                <strong>24h</strong>
                <span>acesso ao ambiente digital</span>
              </div>

              <div className="jv-trust-card">
                <strong>Multi</strong>
                <span>clientes, processos e usuários</span>
              </div>
            </div>
          </div>

          <div className="jv-preview">
            <div className="jv-preview-top">
              <strong>Painel jurídico</strong>
              <div className="jv-preview-dots">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="jv-preview-panel">
              {[
                ["Clientes ativos", "Organização por escritório"],
                ["Processos em andamento", "Histórico e acompanhamento"],
                ["Prazos estratégicos", "Controle da rotina jurídica"],
                ["Cobranças", "Integração com Mercado Pago"],
              ].map(([title, text], index) => (
                <div className="jv-preview-row" key={title}>
                  <div className="jv-icon-box">
                    {index === 0 ? <FaUsers /> : index === 1 ? <FaFolderOpen /> : index === 2 ? <FaRegCalendarCheck /> : <FaChartLine />}
                  </div>

                  <div>
                    <strong>{title}</strong>
                    <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                      {text}
                    </div>
                  </div>

                  <FaCheck style={{ color: "#38bdf8" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="jv-section" id="funcionalidades">
        <div className="jv-container">
          <div className="jv-section-title">
            <h2>Funcionalidades para dominar a operação jurídica.</h2>
            <p>Uma base sólida para organizar atendimento, processos, prazos, equipe e cobrança.</p>
          </div>

          <div className="jv-benefits">
            {benefits.map((item) => (
              <article className="jv-benefit" key={item.title}>
                <div className="jv-icon-box">
                  <item.Icon />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="jv-section" id="modulos">
        <div className="jv-container">
          <div className="jv-section-title">
            <h2>Módulos essenciais em um só lugar.</h2>
            <p>Interface premium e centralizada para a rotina do escritório.</p>
          </div>

          <div className="jv-modules">
            {modules.map((item) => (
              <article className="jv-module-card" key={item.title}>
                <div className="jv-icon-box">
                  <item.Icon />
                </div>
                <h3>{item.title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="jv-section" id="publico">
        <div className="jv-container">
          <div className="jv-section-title">
            <h2>Feito para operações jurídicas profissionais.</h2>
            <p>Ideal para quem precisa de organização, imagem forte e controle operacional.</p>
          </div>

          <div className="jv-audiences">
            {audiences.map((item) => (
              <article className="jv-audience-card" key={item.title}>
                <div className="jv-icon-box">
                  <item.Icon />
                </div>
                <h3>{item.title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="jv-section">
        <div className="jv-container">
          <div className="jv-cta">
            <h2>Pronto para elevar o nível da sua operação jurídica?</h2>
            <p>
              Entre no sistema ou acompanhe seu processo em um ambiente moderno, seguro e profissional.
            </p>

            <div className="jv-hero-actions">
              <a className="jv-primary-button" href={config.loginUrl || "/login"}>
                Entrar no sistema
                <FaArrowRight />
              </a>

              <a className="jv-secondary-button" href={config.trackUrl || "/acompanhar"}>
                Acompanhar processo
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="jv-footer">
        <div className="jv-container">
          {config.footerText || "JURIDICVAS - Plataforma jurídica premium."}
        </div>
      </footer>
    </main>
  );
}