"use client";

import { useEffect, useState } from "react";
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

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number;
  subtitle: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        padding: 22,
        background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,0.22), transparent 65%)",
          filter: "blur(12px)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ color: "#94A3B8", fontSize: 13, marginBottom: 8 }}>{title}</div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "#F8FAFC",
            marginBottom: 8,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div style={{ color: "#64748B", fontSize: 13 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function UsageBar({ percent }: { percent: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, percent))}%`,
          height: "100%",
          borderRadius: 999,
          background: "linear-gradient(90deg, rgba(34,211,238,0.9), rgba(99,102,241,0.9))",
        }}
      />
    </div>
  );
}

function FirmActionCard({ firm }: { firm: FirmCard }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        padding: 18,
        borderRadius: 18,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#F8FAFC" }}>
            {firm.name}
          </div>
          <div style={{ color: "#64748B", fontSize: 13 }}>
            slug: {firm.slug}
          </div>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            background: firm.active
              ? "rgba(16,185,129,0.12)"
              : "rgba(239,68,68,0.12)",
            color: firm.active ? "#6EE7B7" : "#FCA5A5",
            border: firm.active
              ? "1px solid rgba(16,185,129,0.18)"
              : "1px solid rgba(239,68,68,0.18)",
            fontSize: 12,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {firm.active ? "Ativa" : "Inativa"}
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
          <span style={{ color: "#94A3B8" }}>Ocupação do plano</span>
          <span style={{ color: "#E2E8F0", fontWeight: 700 }}>
            {firm.clientsCount}/{firm.maxClients} ({firm.usagePercent}%)
          </span>
        </div>
        <UsageBar percent={firm.usagePercent} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Usuários</div>
          <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{firm.usersCount}</div>
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

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href={`/admin/super/firms/${firm.id}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            padding: "10px 16px",
            background: "linear-gradient(135deg, #06B6D4, #4F46E5)",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Gerenciar advocacia
        </a>

        <a
          href={`/admin/super/firms/${firm.id}/clients`}
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
          href={`/admin/super/firms/${firm.id}/processes`}
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

  useEffect(() => {
    let ignore = false;

    async function load() {
      const me = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!me) return;

      const res = await fetch("/api/super", { cache: "no-store" });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (res.ok) {
        const data = (await res.json()) as DashboardResponse;

        if (!ignore) {
          if (data.stats) setStats(data.stats);
          setTopFirms(data.topFirms ?? []);
          setAttentionFirms(data.attentionFirms ?? []);
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
              DASHBOARD SUPERADMIN
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
              Centro de comando da plataforma
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 15,
                lineHeight: 1.7,
                maxWidth: 860,
              }}
            >
              Visão executiva e operacional do JuridicVas para governar advocacias,
              acompanhar uso, identificar pontos de atenção e entrar direto na operação.
            </p>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <MetricCard title="Advocacias" value={stats.firms} subtitle="Total de escritórios cadastrados" />
          <MetricCard title="Advocacias ativas" value={stats.activeFirms} subtitle="Operando normalmente" />
          <MetricCard title="Advocacias inativas" value={stats.inactiveFirms} subtitle="Exigem atenção administrativa" />
          <MetricCard title="Usuários" value={stats.users} subtitle="Contas totais na plataforma" />
          <MetricCard title="Clientes totais" value={stats.clients} subtitle="Base geral cadastrada" />
          <MetricCard title="Processos totais" value={stats.processes} subtitle="Acervo geral da plataforma" />
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
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
              Advocacias que exigem atenção
            </div>

            {attentionFirms.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                }}
              >
                Nenhuma advocacia crítica no momento.
              </div>
            ) : (
              attentionFirms.map((firm) => (
                <FirmActionCard key={firm.id} firm={firm} />
              ))
            )}
          </div>

          <div
            style={{
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
              Principais advocacias por ocupação
            </div>

            {topFirms.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                }}
              >
                Nenhuma advocacia encontrada.
              </div>
            ) : (
              topFirms.map((firm) => (
                <FirmActionCard key={firm.id} firm={firm} />
              ))
            )}
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}