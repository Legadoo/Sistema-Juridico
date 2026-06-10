"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaChartLine,
  FaClock,
  FaFolderOpen,
  FaScaleBalanced,
  FaShieldHalved,
  FaUserGroup,
} from "react-icons/fa6";
import AdminShell from "@/components/AdminShell";

type MeResponse = {
  user?: {
    id?: string;
    name?: string;
    role?: string;
  };
  id?: string;
  name?: string;
  role?: string;
};

type DeadlineItem = {
  id: string;
  title?: string;
  dueDate?: string;
  done?: boolean;
  client?: {
    name?: string;
  };
  process?: {
    cnj?: string;
  };
};

type DashboardData = {
  clients: number;
  processes: number;
  pendingDeadlines: number;
  recentDeadlines: DeadlineItem[];
};

function normalizeMe(meJson: MeResponse) {
  if (meJson?.user) {
    return {
      name: meJson.user.name ?? "Usuário",
      role: meJson.user.role ?? "SECRETARY",
    };
  }

  return {
    name: meJson?.name ?? "Usuário",
    role: meJson?.role ?? "SECRETARY",
  };
}

function extractArrayPayload(data: unknown, possibleKeys: string[]) {
  if (Array.isArray(data)) return data;

  if (typeof data === "object" && data !== null) {
    for (const key of possibleKeys) {
      const value = (data as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value;
    }
  }

  return [];
}

function formatDate(date?: string) {
  if (!date) return "Sem data";

  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
  } catch {
    return date;
  }
}

function MetricCard({
  title,
  value,
  subtitle,
  Icon,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  Icon: React.ComponentType;
  tone: "purple" | "blue" | "yellow";
}) {
  return (
    <article className={`jv-admin-metric jv-admin-metric-${tone}`}>
      <div className="jv-admin-metric-icon">
        <Icon />
      </div>

      <div>
        <div className="jv-admin-metric-title">{title}</div>
        <div className="jv-admin-metric-value">{value}</div>
        <div className="jv-admin-metric-subtitle">{subtitle}</div>
      </div>

      <div className="jv-admin-metric-arrow">›</div>
      <div className="jv-admin-metric-line" />
    </article>
  );
}

function StrategicItem({
  title,
  primary,
  secondary,
  Icon,
  tone,
}: {
  title: string;
  primary: string;
  secondary: string;
  Icon: React.ComponentType;
  tone: "purple" | "blue" | "green" | "slate";
}) {
  return (
    <div className={`jv-strategy-item jv-strategy-${tone}`}>
      <div className="jv-strategy-icon">
        <Icon />
      </div>

      <div className="jv-strategy-text">
        <div className="jv-strategy-title">{title}</div>
        <div className="jv-strategy-primary">{primary}</div>
        <div className="jv-strategy-secondary">{secondary}</div>
      </div>

      <div className="jv-strategy-arrow">›</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [data, setData] = useState<DashboardData>({
    clients: 0,
    processes: 0,
    pendingDeadlines: 0,
    recentDeadlines: [],
  });

  async function load() {
    const meRes = await fetch("/api/me", { cache: "no-store" });

    if (meRes.ok) {
      const meJson = await meRes.json();
      setMe(normalizeMe(meJson));
    }

    const [clientsRes, processesRes, deadlinesRes] = await Promise.all([
      fetch("/api/admin/clients", { cache: "no-store" }),
      fetch("/api/admin/processes", { cache: "no-store" }),
      fetch("/api/admin/deadlines", { cache: "no-store" }),
    ]);

    const clientsJson = clientsRes.ok ? await clientsRes.json() : [];
    const processesJson = processesRes.ok ? await processesRes.json() : [];
    const deadlinesJson = deadlinesRes.ok ? await deadlinesRes.json() : [];

    const clients = extractArrayPayload(clientsJson, ["clients"]);
    const processes = extractArrayPayload(processesJson, ["processes"]);
    const deadlines = extractArrayPayload(deadlinesJson, ["deadlines"]).filter(
      (item) => typeof item === "object" && item !== null
    ) as DeadlineItem[];

    const pending = deadlines.filter((deadline) => !deadline.done);

    setData({
      clients: clients.length,
      processes: processes.length,
      pendingDeadlines: pending.length,
      recentDeadlines: pending.slice(0, 6),
    });
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

  const strategicItems = useMemo(
    () => [
      {
        title: "Distribuição por área",
        primary: `Cível: ${data.processes}`,
        secondary: "Processos em acompanhamento",
        Icon: FaScaleBalanced,
        tone: "purple" as const,
      },
      {
        title: "Status dos processos",
        primary: `${data.processes} ativo${data.processes === 1 ? "" : "s"}`,
        secondary: "0 suspensos · 0 arquivados",
        Icon: FaShieldHalved,
        tone: "blue" as const,
      },
      {
        title: "Faturamento do mês",
        primary: "R$ 0,00",
        secondary: "0 recebido · 0 a receber",
        Icon: FaChartLine,
        tone: "green" as const,
      },
      {
        title: "Audiências agendadas",
        primary: "0 hoje",
        secondary: "0 esta semana",
        Icon: FaCalendarCheck,
        tone: "slate" as const,
      },
    ],
    [data.processes]
  );

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
        Carregando painel...
      </div>
    );
  }

  return (
    <AdminShell role={me.role} userName={me.name}>
      <div className="jv-admin-dashboard">
        <style>{`
          .jv-admin-dashboard {
            display: grid;
            gap: 20px;
          }

          .jv-admin-dashboard * {
            box-sizing: border-box;
          }

          .jv-dashboard-hero {
            min-height: 300px;
            position: relative;
            overflow: hidden;
            border-radius: 28px;
            border: 1px solid rgba(168, 85, 247, 0.22);
            background:
              linear-gradient(90deg, rgba(7, 10, 23, 0.96), rgba(12, 15, 31, 0.82), rgba(17, 24, 39, 0.70)),
              radial-gradient(circle at 82% 17%, rgba(124, 58, 237, 0.34), transparent 32%),
              linear-gradient(135deg, #090b16, #111827);
            box-shadow:
              0 34px 90px rgba(0,0,0,0.36),
              inset 0 1px 0 rgba(255,255,255,0.045);
            padding: 38px 42px;
          }

          .jv-dashboard-hero::before {
            content: "";
            position: absolute;
            right: 70px;
            bottom: 10px;
            width: 390px;
            height: 210px;
            opacity: 0.48;
            background:
              radial-gradient(circle at 42% 54%, rgba(168,85,247,0.50), transparent 10%),
              linear-gradient(180deg, transparent 0 44px, rgba(168,85,247,0.58) 45px 48px, transparent 49px),
              linear-gradient(90deg, transparent 0 70px, rgba(192,132,252,0.40) 71px 73px, transparent 74px);
            clip-path: polygon(50% 0, 85% 22%, 80% 26%, 80% 34%, 20% 34%, 20% 26%, 15% 22%);
            filter: drop-shadow(0 0 34px rgba(168,85,247,0.38));
          }

          .jv-dashboard-hero::after {
            content: "";
            position: absolute;
            right: 180px;
            bottom: 70px;
            width: 340px;
            height: 55px;
            border-radius: 999px;
            background: radial-gradient(circle, rgba(168,85,247,0.42), transparent 70%);
            filter: blur(15px);
          }

          .jv-hero-content {
            position: relative;
            z-index: 2;
            max-width: 760px;
            display: grid;
            gap: 16px;
          }

          .jv-hero-title {
            margin: 0;
            color: #f8fafc;
            font-size: clamp(40px, 4vw, 58px);
            line-height: 0.98;
            font-weight: 950;
            letter-spacing: -0.06em;
          }

          .jv-hero-text {
            margin: 0;
            color: #cbd5e1;
            font-size: 17px;
            line-height: 1.7;
          }

          .jv-period-button {
            width: fit-content;
            min-height: 54px;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            margin-top: 18px;
            padding: 0 18px;
            border-radius: 15px;
            border: 1px solid rgba(148,163,184,0.18);
            background: rgba(15,23,42,0.58);
            color: #f8fafc;
            font-size: 15px;
            font-weight: 850;
          }

          .jv-metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }

          .jv-admin-metric {
            min-height: 150px;
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 18px;
            padding: 22px;
            border-radius: 23px;
            border: 1px solid rgba(148,163,184,0.16);
            background:
              radial-gradient(circle at 95% 5%, rgba(124,58,237,0.18), transparent 32%),
              linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.64));
            box-shadow: 0 26px 60px rgba(0,0,0,0.27);
          }

          .jv-admin-metric-icon {
            width: 78px;
            height: 78px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            font-size: 32px;
          }

          .jv-admin-metric-purple .jv-admin-metric-icon {
            color: #d8b4fe;
            background: radial-gradient(circle, rgba(168,85,247,0.45), rgba(15,23,42,0.72));
            box-shadow: 0 0 38px rgba(168,85,247,0.18);
          }

          .jv-admin-metric-blue .jv-admin-metric-icon {
            color: #93c5fd;
            background: radial-gradient(circle, rgba(59,130,246,0.45), rgba(15,23,42,0.72));
            box-shadow: 0 0 38px rgba(59,130,246,0.18);
          }

          .jv-admin-metric-yellow .jv-admin-metric-icon {
            color: #facc15;
            background: radial-gradient(circle, rgba(202,138,4,0.45), rgba(15,23,42,0.72));
            box-shadow: 0 0 38px rgba(202,138,4,0.18);
          }

          .jv-admin-metric-title {
            color: #cbd5e1;
            font-size: 15px;
          }

          .jv-admin-metric-value {
            margin-top: 6px;
            color: #f8fafc;
            font-size: 38px;
            line-height: 1;
            font-weight: 950;
            letter-spacing: -0.05em;
          }

          .jv-admin-metric-subtitle {
            margin-top: 8px;
            color: #a1a1aa;
            font-size: 14px;
          }

          .jv-admin-metric-arrow {
            color: #cbd5e1;
            font-size: 38px;
            opacity: 0.9;
          }

          .jv-admin-metric-line {
            position: absolute;
            left: 22px;
            bottom: 15px;
            width: calc(100% - 44px);
            height: 3px;
            border-radius: 999px;
            background: rgba(148,163,184,0.16);
          }

          .jv-admin-metric-purple .jv-admin-metric-line {
            background: linear-gradient(90deg, #a855f7 0 24%, rgba(148,163,184,0.14) 24%);
          }

          .jv-admin-metric-blue .jv-admin-metric-line {
            background: linear-gradient(90deg, #60a5fa 0 24%, rgba(148,163,184,0.14) 24%);
          }

          .jv-admin-metric-yellow .jv-admin-metric-line {
            background: linear-gradient(90deg, #facc15 0 24%, rgba(148,163,184,0.14) 24%);
          }

          .jv-dashboard-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) minmax(380px, 0.78fr);
            gap: 16px;
            align-items: start;
          }

          .jv-panel {
            border-radius: 24px;
            border: 1px solid rgba(168,85,247,0.22);
            background:
              radial-gradient(circle at 0% 0%, rgba(124,58,237,0.11), transparent 30%),
              linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.56));
            box-shadow: 0 28px 70px rgba(0,0,0,0.26);
            padding: 22px;
          }

          .jv-panel-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 16px;
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

          .jv-warning-pill {
            display: inline-flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: 999px;
            color: #facc15;
            border: 1px solid rgba(202,138,4,0.34);
            background: rgba(202,138,4,0.12);
            font-size: 12px;
            font-weight: 950;
          }

          .jv-deadline-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }

          .jv-deadline-table th {
            padding: 13px 10px;
            border-top: 1px solid rgba(148,163,184,0.10);
            border-bottom: 1px solid rgba(148,163,184,0.10);
            text-align: left;
            color: #a1a1aa;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .jv-deadline-table td {
            padding: 14px 10px;
            border-bottom: 1px solid rgba(148,163,184,0.08);
            color: #e5e7eb;
            font-size: 14px;
          }

          .jv-empty-deadlines {
            min-height: 260px;
            display: grid;
            place-items: center;
            text-align: center;
            color: #cbd5e1;
          }

          .jv-empty-icon {
            width: 86px;
            height: 86px;
            display: grid;
            place-items: center;
            margin: 0 auto 18px;
            border-radius: 999px;
            color: #d8b4fe;
            font-size: 38px;
            background: radial-gradient(circle, rgba(168,85,247,0.32), rgba(15,23,42,0.75));
          }

          .jv-empty-title {
            color: #e5e7eb;
            font-size: 20px;
            font-weight: 850;
          }

          .jv-empty-subtitle {
            margin-top: 8px;
            color: #a1a1aa;
            font-size: 15px;
          }

          .jv-strategy-list {
            display: grid;
            gap: 10px;
          }

          .jv-strategy-item {
            min-height: 82px;
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            gap: 16px;
            padding: 14px;
            border-radius: 18px;
            border: 1px solid rgba(148,163,184,0.12);
            background: rgba(255,255,255,0.035);
          }

          .jv-strategy-icon {
            width: 58px;
            height: 58px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            font-size: 24px;
          }

          .jv-strategy-purple .jv-strategy-icon {
            color: #d8b4fe;
            background: rgba(168,85,247,0.20);
          }

          .jv-strategy-blue .jv-strategy-icon {
            color: #93c5fd;
            background: rgba(59,130,246,0.20);
          }

          .jv-strategy-green .jv-strategy-icon {
            color: #86efac;
            background: rgba(34,197,94,0.18);
          }

          .jv-strategy-slate .jv-strategy-icon {
            color: #cbd5e1;
            background: rgba(148,163,184,0.14);
          }

          .jv-strategy-title {
            color: #cbd5e1;
            font-size: 14px;
          }

          .jv-strategy-primary {
            margin-top: 5px;
            color: #f8fafc;
            font-size: 17px;
            font-weight: 850;
          }

          .jv-strategy-secondary {
            margin-top: 3px;
            color: #a1a1aa;
            font-size: 13px;
          }

          .jv-strategy-arrow {
            color: #cbd5e1;
            font-size: 34px;
          }

          @media (max-width: 1200px) {
            .jv-metrics-grid,
            .jv-dashboard-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 1024px) {
            .jv-admin-dashboard {
              gap: 16px;
            }

            .jv-dashboard-hero {
              min-height: auto;
              padding: 28px 26px;
              border-radius: 24px;
            }

            .jv-dashboard-hero::before {
              right: 28px;
              bottom: 20px;
              width: 250px;
              height: 150px;
              opacity: 0.32;
            }

            .jv-dashboard-hero::after {
              display: none;
            }

            .jv-hero-title {
              font-size: 40px;
            }

            .jv-metrics-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(170px, 1fr));
              overflow-x: auto;
              padding-bottom: 4px;
            }

            .jv-admin-metric {
              min-width: 180px;
              min-height: 220px;
              grid-template-columns: 1fr;
              align-content: start;
            }

            .jv-admin-metric-icon {
              width: 74px;
              height: 74px;
            }

            .jv-admin-metric-arrow {
              position: absolute;
              right: 18px;
              top: 42px;
            }
          }

          @media (max-width: 640px) {
            .jv-dashboard-hero {
              padding: 26px 22px;
            }

            .jv-hero-title {
              font-size: 37px;
            }

            .jv-hero-text {
              font-size: 16px;
            }

            .jv-period-button {
              min-height: 52px;
            }

            .jv-dashboard-hero::before {
              position: relative;
              display: block;
              right: auto;
              bottom: auto;
              width: 100%;
              height: 175px;
              margin-top: 22px;
              opacity: 0.42;
            }

            .jv-panel {
              padding: 18px;
              border-radius: 22px;
            }

            .jv-panel-title-row {
              align-items: flex-start;
            }

            .jv-deadline-table thead {
              display: none;
            }

            .jv-deadline-table,
            .jv-deadline-table tbody,
            .jv-deadline-table tr,
            .jv-deadline-table td {
              display: block;
              width: 100%;
            }

            .jv-deadline-table tr {
              padding: 12px 0;
              border-bottom: 1px solid rgba(148,163,184,0.10);
            }

            .jv-deadline-table td {
              border-bottom: 0;
              padding: 6px 0;
            }

            .jv-strategy-item {
              grid-template-columns: auto 1fr;
            }

            .jv-strategy-arrow {
              display: none;
            }
          }
        `}</style>

        <section className="jv-dashboard-hero">
          <div className="jv-hero-content">
            <h1 className="jv-hero-title">Dashboard</h1>

            <p className="jv-hero-text">
              Resumo das atividades do escritório hoje.
            </p>

            <button type="button" className="jv-period-button">
              <FaCalendarCheck />
              Hoje
            </button>
          </div>
        </section>

        <section className="jv-metrics-grid">
          <MetricCard
            title="Clientes ativos"
            value={data.clients}
            subtitle="+0 hoje"
            Icon={FaUserGroup}
            tone="purple"
          />

          <MetricCard
            title="Processos ativos"
            value={data.processes}
            subtitle="+0 hoje"
            Icon={FaFolderOpen}
            tone="blue"
          />

          <MetricCard
            title="Prazos pendentes"
            value={data.pendingDeadlines}
            subtitle={data.pendingDeadlines > 0 ? "Itens a vencer" : "Sem vencimentos"}
            Icon={FaClock}
            tone="yellow"
          />
        </section>

        <section className="jv-dashboard-grid">
          <div className="jv-panel">
            <div className="jv-panel-title-row">
              <h2 className="jv-panel-title">
                <FaCalendarCheck />
                Próximos prazos
              </h2>

              <div className="jv-warning-pill">
                {data.pendingDeadlines} vencendo hoje
              </div>
            </div>

            {data.recentDeadlines.length > 0 ? (
              <table className="jv-deadline-table">
                <thead>
                  <tr>
                    <th>Prazo</th>
                    <th>Processo</th>
                    <th>Cliente</th>
                    <th>Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentDeadlines.map((deadline) => (
                    <tr key={deadline.id}>
                      <td>{deadline.title || "Prazo"}</td>
                      <td>{deadline.process?.cnj || "Não vinculado"}</td>
                      <td>{deadline.client?.name || "Não informado"}</td>
                      <td>{formatDate(deadline.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="jv-empty-deadlines">
                <div>
                  <div className="jv-empty-icon">
                    <FaCalendarCheck />
                  </div>
                  <div className="jv-empty-title">Nenhum prazo a vencer.</div>
                  <div className="jv-empty-subtitle">Tudo em dia.</div>
                </div>
              </div>
            )}
          </div>

          <div className="jv-panel">
            <div className="jv-panel-title-row">
              <h2 className="jv-panel-title">
                <FaChartLine />
                Visão estratégica
              </h2>
            </div>

            <div className="jv-strategy-list">
              {strategicItems.map((item) => (
                <StrategicItem
                  key={item.title}
                  title={item.title}
                  primary={item.primary}
                  secondary={item.secondary}
                  Icon={item.Icon}
                  tone={item.tone}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}