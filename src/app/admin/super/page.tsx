"use client";

import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  FaArrowRight,
  FaBuildingColumns,
  FaChartSimple,
  FaCircleExclamation,
  FaFolderOpen,
  FaLandmark,
  FaScaleBalanced,
  FaShieldHalved,
  FaUserGroup,
  FaUsersGear,
  FaWaveSquare,
} from "react-icons/fa6";
import SuperAdminShell from "@/components/SuperAdminShell";
import { fetchMeOrRedirect } from "@/lib/superadmin/clientGuard";

type FirmCard = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  maxClients: number;
  usersCount: number;
  clientsCount: number;
  processesCount: number;
  usagePercent: number;
  nearLimit: boolean;
};

type DashboardResponse = {
  ok?: boolean;
  stats?: {
    firms: number;
    activeFirms: number;
    inactiveFirms: number;
    users: number;
    clients: number;
    activeClients: number;
    processes: number;
    activeProcesses: number;
  };
  topFirms?: FirmCard[];
  attentionFirms?: FirmCard[];
};

type MetricCardProps = {
  title: string;
  value: number;
  subtitle: string;
  Icon: IconType;
};

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "JV";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={active ? "jv-status jv-status-active" : "jv-status jv-status-inactive"}>
      {active ? "Ativa" : "Inativa"}
    </span>
  );
}

function UsageBar({ percent, danger = false }: { percent: number; danger?: boolean }) {
  const safePercent = Math.max(0, Math.min(100, percent || 0));

  return (
    <div className="jv-usage">
      <div
        className={danger ? "jv-usage-fill jv-usage-fill-danger" : "jv-usage-fill"}
        style={{ width: `${safePercent}%` }}
      />
    </div>
  );
}

function MetricCard({ title, value, subtitle, Icon }: MetricCardProps) {
  return (
    <article className="jv-metric-card">
      <div className="jv-metric-glow" />

      <div className="jv-metric-icon">
        <Icon />
      </div>

      <div>
        <div className="jv-metric-title">{title}</div>
        <div className="jv-metric-value">{value}</div>
        <div className="jv-metric-subtitle">{subtitle}</div>
      </div>
    </article>
  );
}

function AttentionFirmCard({ firm }: { firm: FirmCard }) {
  const danger = !firm.active || firm.nearLimit;

  return (
    <article className="jv-attention-card">
      <div className={firm.active ? "jv-avatar jv-avatar-ok" : "jv-avatar jv-avatar-danger"}>
        {getInitials(firm.name)}
      </div>

      <div className="jv-attention-main">
        <div className="jv-card-name">{firm.name}</div>
        <div className="jv-card-slug">slug: {firm.slug}</div>

        <div className="jv-mobile-status">
          <StatusBadge active={firm.active} />
        </div>
      </div>

      <div className="jv-attention-usage">
        <div className="jv-usage-row">
          <span>Ocupação do plano</span>
          <strong>
            {firm.clientsCount}/{firm.maxClients} ({firm.usagePercent}%)
          </strong>
        </div>

        <UsageBar percent={firm.usagePercent} danger={danger} />
      </div>

      <div className="jv-recommendation-box">
        {danger ? (
          <>
            <div className="jv-recommendation-title jv-danger-text">
              <FaCircleExclamation />
              Ações recomendadas
            </div>
            <p>Ativar escritório, revisar plano ou verificar limite contratado.</p>
          </>
        ) : (
          <>
            <div className="jv-recommendation-title jv-ok-text">
              <FaShieldHalved />
              Status
            </div>
            <p>Operando normalmente.</p>
          </>
        )}
      </div>
    </article>
  );
}

function TopFirmCard({ firm }: { firm: FirmCard }) {
  return (
    <article className="jv-top-firm-card">
      <div className="jv-top-head">
        <div className="jv-top-avatar">{getInitials(firm.name)}</div>

        <div className="jv-top-title-wrap">
          <div className="jv-card-name">{firm.name}</div>
          <div className="jv-card-slug">slug: {firm.slug}</div>
        </div>

        <StatusBadge active={firm.active} />
      </div>

      <div className="jv-usage-row">
        <span>Ocupação do plano</span>
        <strong>
          {firm.clientsCount}/{firm.maxClients} ({firm.usagePercent}%)
        </strong>
      </div>

      <UsageBar percent={firm.usagePercent} danger={firm.nearLimit} />

      <div className="jv-mini-grid">
        <div className="jv-mini-box">
          <span>Usuários</span>
          <strong>{firm.usersCount}</strong>
        </div>

        <div className="jv-mini-box">
          <span>Clientes</span>
          <strong>{firm.clientsCount}</strong>
        </div>

        <div className="jv-mini-box">
          <span>Processos</span>
          <strong>{firm.processesCount}</strong>
        </div>
      </div>

      <div className="jv-card-actions">
        <a className="jv-primary-action" href={`/admin/super/firms/${firm.id}`}>
          Gerenciar advocacia
        </a>

        <a className="jv-secondary-action" href={`/admin/super/firms/${firm.id}/clients`}>
          Ver clientes
        </a>

        <a className="jv-secondary-action" href={`/admin/super/firms/${firm.id}/processes`}>
          Ver processos
        </a>
      </div>
    </article>
  );
}

export default function SuperadminDashboardPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [stats, setStats] = useState({
    firms: 0,
    activeFirms: 0,
    inactiveFirms: 0,
    users: 0,
    clients: 0,
    activeClients: 0,
    processes: 0,
    activeProcesses: 0,
  });

  const [topFirms, setTopFirms] = useState<FirmCard[]>([]);
  const [attentionFirms, setAttentionFirms] = useState<FirmCard[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const metricCards = useMemo(
    () => [
      {
        title: "Advocacias",
        value: stats.firms,
        subtitle: "Total de escritórios cadastrados",
        Icon: FaUserGroup,
      },
      {
        title: "Advocacias ativas",
        value: stats.activeFirms,
        subtitle: "Operando normalmente",
        Icon: FaWaveSquare,
      },
      {
        title: "Advocacias inativas",
        value: stats.inactiveFirms,
        subtitle: "Exigem atenção administrativa",
        Icon: FaCircleExclamation,
      },
      {
        title: "Usuários",
        value: stats.users,
        subtitle: "Contas totais na plataforma",
        Icon: FaUsersGear,
      },
      {
        title: "Clientes totais",
        value: stats.clients,
        subtitle: "Base geral cadastrada",
        Icon: FaUserGroup,
      },
      {
        title: "Processos totais",
        value: stats.processes,
        subtitle: "Acervo geral da plataforma",
        Icon: FaFolderOpen,
      },
    ],
    [stats]
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      const currentUser = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!currentUser) return;

      try {
        const response = await fetch("/api/super", { cache: "no-store" });

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (response.ok) {
          const data = (await response.json()) as DashboardResponse;

          if (!ignore) {
            if (data.stats) setStats(data.stats);
            setTopFirms(data.topFirms ?? []);
            setAttentionFirms(data.attentionFirms ?? []);
          }
        }
      } finally {
        if (!ignore) {
          setLoadingDashboard(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  if (!me) {
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
        Carregando console SaaS...
      </div>
    );
  }

  return (
    <SuperAdminShell userName={me.name}>
      <div className="jv-dashboard-premium">
        <style>{`
          .jv-dashboard-premium {
            display: grid;
            gap: 22px;
          }

          .jv-dashboard-premium * {
            box-sizing: border-box;
          }

          .jv-hero-dashboard {
            position: relative;
            min-height: 235px;
            overflow: hidden;
            border-radius: 30px;
            border: 1px solid rgba(56,189,248,0.24);
            background:
              radial-gradient(circle at 9% 10%, rgba(20,184,166,0.23), transparent 30%),
              radial-gradient(circle at 88% 82%, rgba(14,165,233,0.26), transparent 28%),
              linear-gradient(135deg, rgba(7,17,31,0.96), rgba(15,23,42,0.92));
            box-shadow:
              0 34px 90px rgba(0,0,0,0.34),
              inset 0 1px 0 rgba(255,255,255,0.05);
            padding: 34px;
          }

          .jv-hero-dashboard::before {
            content: "";
            position: absolute;
            right: 90px;
            top: 24px;
            width: 390px;
            height: 190px;
            opacity: 0.42;
            border: 1px solid rgba(22,119,255,0.35);
            border-radius: 999px;
            transform: rotate(-18deg);
          }

          .jv-hero-dashboard::after {
            content: "";
            position: absolute;
            right: 98px;
            top: 50px;
            width: 320px;
            height: 150px;
            background:
              linear-gradient(180deg, transparent 0 22px, rgba(22,119,255,0.66) 23px 25px, transparent 26px),
              linear-gradient(90deg, transparent 0 30px, rgba(56,189,248,0.50) 31px 33px, transparent 34px),
              linear-gradient(135deg, rgba(22,119,255,0.42), rgba(14,165,233,0.08));
            clip-path: polygon(50% 0, 100% 28%, 94% 34%, 94% 42%, 6% 42%, 6% 34%, 0 28%);
            filter: drop-shadow(0 0 32px rgba(22,119,255,0.50));
          }

          .jv-hero-content {
            position: relative;
            z-index: 2;
            display: grid;
            gap: 12px;
            max-width: 850px;
          }

          .jv-kicker-premium {
            width: fit-content;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 9px 15px;
            border-radius: 999px;
            border: 1px solid rgba(56,189,248,0.24);
            background: rgba(15,23,42,0.58);
            color: #BAE6FD;
            font-size: 12px;
            font-weight: 950;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }

          .jv-hero-title {
            margin: 0;
            color: #F8FAFC;
            font-size: clamp(30px, 3.1vw, 44px);
            font-weight: 950;
            letter-spacing: -0.055em;
            line-height: 1.02;
          }

          .jv-hero-text {
            margin: 0;
            max-width: 860px;
            color: #CBD5E1;
            font-size: 15px;
            line-height: 1.75;
          }

          .jv-metrics-grid {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 16px;
          }

          .jv-metric-card {
            min-height: 154px;
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 16px;
            align-items: center;
            padding: 20px;
            border-radius: 23px;
            border: 1px solid rgba(148,163,184,0.18);
            background:
              radial-gradient(circle at 100% 0%, rgba(56,189,248,0.15), transparent 34%),
              linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.72));
            box-shadow:
              0 24px 60px rgba(0,0,0,0.26),
              inset 0 1px 0 rgba(255,255,255,0.045);
          }

          .jv-metric-glow {
            position: absolute;
            right: -28px;
            top: -28px;
            width: 120px;
            height: 120px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(56,189,248,0.24), transparent 65%);
            filter: blur(10px);
          }

          .jv-metric-icon {
            position: relative;
            z-index: 1;
            width: 54px;
            height: 54px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            color: #67E8F9;
            background:
              radial-gradient(circle, rgba(14,165,233,0.26), rgba(15,23,42,0.72));
            border: 1px solid rgba(56,189,248,0.35);
            box-shadow:
              0 0 28px rgba(14,165,233,0.20),
              inset 0 1px 0 rgba(255,255,255,0.08);
            font-size: 22px;
          }

          .jv-metric-title {
            color: #CBD5E1;
            font-size: 13px;
            line-height: 1.35;
          }

          .jv-metric-value {
            color: #F8FAFC;
            font-size: 34px;
            font-weight: 950;
            line-height: 1;
            margin-top: 8px;
            letter-spacing: -0.05em;
          }

          .jv-metric-subtitle {
            color: #94A3B8;
            font-size: 13px;
            line-height: 1.45;
            margin-top: 10px;
          }

          .jv-dashboard-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.08fr) minmax(420px, 0.92fr);
            gap: 20px;
            align-items: start;
          }

          .jv-panel {
            min-height: 360px;
            border-radius: 28px;
            border: 1px solid rgba(56,189,248,0.18);
            background:
              radial-gradient(circle at 0% 0%, rgba(22,119,255,0.11), transparent 30%),
              linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.62));
            box-shadow: 0 28px 70px rgba(0,0,0,0.26);
            padding: 22px;
          }

          .jv-panel-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 14px;
            margin-bottom: 18px;
          }

          .jv-panel-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0;
            color: #F8FAFC;
            font-size: 23px;
            font-weight: 950;
            letter-spacing: -0.045em;
          }

          .jv-panel-title svg {
            color: #38BDF8;
          }

          .jv-panel-desc {
            color: #CBD5E1;
            font-size: 13px;
            line-height: 1.55;
            margin-top: 5px;
          }

          .jv-see-all {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            white-space: nowrap;
            padding: 10px 14px;
            border-radius: 14px;
            color: #E2E8F0;
            text-decoration: none;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(255,255,255,0.10);
            font-size: 13px;
            font-weight: 850;
          }

          .jv-panel-list {
            display: grid;
            gap: 14px;
          }

          .jv-attention-card {
            display: grid;
            grid-template-columns: auto minmax(180px, 1fr) minmax(190px, 0.8fr) minmax(170px, 0.74fr);
            gap: 18px;
            align-items: center;
            padding: 18px;
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.16);
            background:
              linear-gradient(180deg, rgba(15,23,42,0.82), rgba(15,23,42,0.62));
          }

          .jv-avatar,
          .jv-top-avatar {
            display: grid;
            place-items: center;
            border-radius: 999px;
            color: #F8FAFC;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jv-avatar {
            width: 84px;
            height: 84px;
            font-size: 25px;
          }

          .jv-avatar-danger {
            border: 2px solid rgba(248,113,113,0.88);
            background: radial-gradient(circle, rgba(127,29,29,0.66), rgba(15,23,42,0.90));
            box-shadow: 0 0 34px rgba(248,113,113,0.16);
          }

          .jv-avatar-ok {
            border: 2px solid rgba(52,211,153,0.86);
            background: radial-gradient(circle, rgba(6,78,59,0.62), rgba(15,23,42,0.90));
            box-shadow: 0 0 34px rgba(52,211,153,0.16);
          }

          .jv-card-name {
            color: #F8FAFC;
            font-size: 19px;
            font-weight: 950;
            line-height: 1.15;
          }

          .jv-card-slug {
            color: #94A3B8;
            font-size: 13px;
            margin-top: 7px;
          }

          .jv-mobile-status {
            display: none;
            margin-top: 10px;
          }

          .jv-status {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            border-radius: 999px;
            padding: 7px 12px;
            font-size: 12px;
            font-weight: 950;
          }

          .jv-status-active {
            color: #A7F3D0;
            background: rgba(16,185,129,0.13);
            border: 1px solid rgba(16,185,129,0.24);
          }

          .jv-status-inactive {
            color: #FCA5A5;
            background: rgba(248,113,113,0.13);
            border: 1px solid rgba(248,113,113,0.24);
          }

          .jv-usage-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            color: #CBD5E1;
            font-size: 13px;
            margin-bottom: 9px;
          }

          .jv-usage-row strong {
            color: #F8FAFC;
            font-size: 14px;
          }

          .jv-usage {
            height: 10px;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(148,163,184,0.13);
          }

          .jv-usage-fill {
            height: 100%;
            min-width: 7px;
            border-radius: 999px;
            background: linear-gradient(90deg, #38BDF8, #4F46E5);
            box-shadow: 0 0 20px rgba(56,189,248,0.26);
          }

          .jv-usage-fill-danger {
            background: linear-gradient(90deg, #F43F5E, #FB7185);
          }

          .jv-recommendation-box {
            min-height: 86px;
            display: grid;
            align-content: center;
            gap: 8px;
            padding: 14px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.045);
          }

          .jv-recommendation-title {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 900;
          }

          .jv-recommendation-box p {
            margin: 0;
            color: #CBD5E1;
            font-size: 13px;
            line-height: 1.5;
          }

          .jv-danger-text {
            color: #FDA4AF;
          }

          .jv-ok-text {
            color: #6EE7B7;
          }

          .jv-top-firm-card {
            display: grid;
            gap: 14px;
            padding: 18px;
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.16);
            background:
              linear-gradient(180deg, rgba(15,23,42,0.82), rgba(15,23,42,0.62));
          }

          .jv-top-head {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 14px;
          }

          .jv-top-avatar {
            width: 58px;
            height: 58px;
            color: #BFDBFE;
            border: 1px solid rgba(56,189,248,0.50);
            background:
              radial-gradient(circle, rgba(79,70,229,0.55), rgba(15,23,42,0.88));
            box-shadow: 0 0 28px rgba(56,189,248,0.18);
            font-size: 18px;
          }

          .jv-top-title-wrap {
            min-width: 0;
          }

          .jv-mini-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }

          .jv-mini-box {
            padding: 13px;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.045);
          }

          .jv-mini-box span {
            display: block;
            color: #94A3B8;
            font-size: 12px;
            margin-bottom: 7px;
          }

          .jv-mini-box strong {
            color: #F8FAFC;
            font-size: 15px;
          }

          .jv-card-actions {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr 0.9fr;
            gap: 10px;
          }

          .jv-primary-action,
          .jv-secondary-action {
            min-height: 46px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 950;
            text-align: center;
            padding: 0 12px;
          }

          .jv-primary-action {
            color: white;
            background: linear-gradient(135deg, #06B6D4, #4F46E5);
            box-shadow: 0 18px 40px rgba(37,99,235,0.22);
          }

          .jv-secondary-action {
            color: #E2E8F0;
            border: 1px solid rgba(255,255,255,0.11);
            background: rgba(255,255,255,0.035);
          }

          .jv-empty-box {
            min-height: 180px;
            display: grid;
            place-items: center;
            text-align: center;
            color: #94A3B8;
            border-radius: 22px;
            border: 1px dashed rgba(148,163,184,0.22);
            background: rgba(255,255,255,0.025);
            padding: 20px;
          }

          @media (max-width: 1500px) {
            .jv-metrics-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .jv-dashboard-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 1050px) {
            .jv-attention-card {
              grid-template-columns: auto 1fr;
            }

            .jv-attention-usage,
            .jv-recommendation-box {
              grid-column: 1 / -1;
            }

            .jv-hero-dashboard::before,
            .jv-hero-dashboard::after {
              opacity: 0.18;
            }
          }

          @media (max-width: 760px) {
            .jv-metrics-grid {
              grid-template-columns: 1fr;
            }

            .jv-hero-dashboard {
              padding: 24px;
              min-height: auto;
            }

            .jv-hero-title {
              font-size: 30px;
            }

            .jv-top-head {
              grid-template-columns: auto 1fr;
            }

            .jv-top-head .jv-status {
              grid-column: 1 / -1;
            }

            .jv-mini-grid,
            .jv-card-actions {
              grid-template-columns: 1fr;
            }

            .jv-attention-card {
              grid-template-columns: 1fr;
            }

            .jv-avatar {
              width: 70px;
              height: 70px;
            }

            .jv-mobile-status {
              display: block;
            }
          }
        `}</style>

        <section className="jv-hero-dashboard">
          <div className="jv-hero-content">
            <div className="jv-kicker-premium">
              <FaLandmark />
              Dashboard Superadmin
            </div>

            <h1 className="jv-hero-title">Centro de comando da plataforma</h1>

            <p className="jv-hero-text">
              Visão executiva e operacional do JuridicVas para governar advocacias,
              acompanhar uso, identificar pontos de atenção e entrar direto na operação.
            </p>
          </div>
        </section>

        <section className="jv-metrics-grid">
          {metricCards.map((card) => (
            <MetricCard
              key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              Icon={card.Icon}
            />
          ))}
        </section>

        <section className="jv-dashboard-grid">
          <div className="jv-panel">
            <div className="jv-panel-head">
              <div>
                <h2 className="jv-panel-title">
                  <FaShieldHalved />
                  Advocacias que exigem atenção
                </h2>
                <div className="jv-panel-desc">
                  Monitore e atue rapidamente nos escritórios que precisam de atenção.
                </div>
              </div>

              <a className="jv-see-all" href="/admin/super/firms">
                Ver todos
                <FaArrowRight />
              </a>
            </div>

            <div className="jv-panel-list">
              {loadingDashboard ? (
                <div className="jv-empty-box">Carregando informações...</div>
              ) : attentionFirms.length > 0 ? (
                attentionFirms.map((firm) => <AttentionFirmCard key={firm.id} firm={firm} />)
              ) : (
                <div className="jv-empty-box">
                  Nenhuma advocacia exige atenção no momento.
                </div>
              )}
            </div>
          </div>

          <div className="jv-panel">
            <div className="jv-panel-head">
              <div>
                <h2 className="jv-panel-title">
                  <FaChartSimple />
                  Principais advocacias por ocupação
                </h2>
                <div className="jv-panel-desc">
                  Acompanhe o uso dos planos e o engajamento dos escritórios.
                </div>
              </div>
            </div>

            <div className="jv-panel-list">
              {loadingDashboard ? (
                <div className="jv-empty-box">Carregando ranking...</div>
              ) : topFirms.length > 0 ? (
                topFirms.map((firm) => <TopFirmCard key={firm.id} firm={firm} />)
              ) : (
                <div className="jv-empty-box">
                  Nenhuma advocacia cadastrada para exibir no ranking.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}