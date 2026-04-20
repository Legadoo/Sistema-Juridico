"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import PremiumModal from "@/components/PremiumModal";
import PremiumToast from "@/components/PremiumToast";

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
};

type DashboardData = {
  clients: number;
  processes: number;
  pendingDeadlines: number;
  recentDeadlines: DeadlineItem[];
};

type PremiumCardProps = {
  title: string;
  value: number;
  subtitle: string;
  compact?: boolean;
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

function PremiumCard({ title, value, subtitle, compact = false }: PremiumCardProps) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        padding: compact ? 18 : 22,
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
          width: compact ? 90 : 120,
          height: compact ? 90 : 120,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.26), transparent 65%)",
          filter: "blur(12px)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ color: "#94A3B8", fontSize: compact ? 12 : 13, marginBottom: 8 }}>
          {title}
        </div>
        <div
          style={{
            fontSize: compact ? 30 : 36,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "#F8FAFC",
            marginBottom: 8,
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div style={{ color: "#64748B", fontSize: compact ? 12 : 13 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function formatDate(date?: string) {
  if (!date) return "Sem data";
  try {
    return new Date(date).toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
}

export default function AdminDashboardPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [data, setData] = useState<DashboardData>({
    clients: 0,
    processes: 0,
    pendingDeadlines: 0,
    recentDeadlines: [],
  });
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    type: "info",
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

    const pending = deadlines.filter((d) => !d.done);

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

  useEffect(() => {
    function updateViewport() {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
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
        Carregando painel premium...
      </div>
    );
  }

  const compact = isMobile;
  const heroTitleSize = isMobile ? 24 : isTablet ? 30 : 34;
  const heroPadding = isMobile ? 20 : isTablet ? 24 : 28;
  const outerGap = isMobile ? 18 : 24;

  return (
    <AdminShell role={me.role} userName={me.name}>
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PremiumModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Experiência Premium ativada"
        description="Este modal já representa a nova base visual do JuridicVas para confirmações, edições, exclusões e ações importantes do sistema."
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setShowModal(false)}
            >
              Fechar
            </button>
            <button
              className="jv-premium-btn"
              onClick={() => {
                setShowModal(false);
                setToast({
                  open: true,
                  message: "Visual premium confirmado com sucesso.",
                  type: "success",
                });
              }}
            >
              Confirmar
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          <input
            className="jv-premium-input"
            placeholder="Exemplo de input premium"
          />
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#94A3B8",
              lineHeight: 1.7,
            }}
          >
            A partir daqui, podemos usar esse mesmo componente em edição de cliente,
            criação de processo, confirmação de exclusão e feedback operacional.
          </div>
        </div>
      </PremiumModal>

      <div style={{ display: "grid", gap: outerGap }}>
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: isMobile ? 24 : 28,
            padding: heroPadding,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(15,23,42,0.88) 45%, rgba(56,189,248,0.10))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -10,
              width: isMobile ? 120 : 180,
              height: isMobile ? 120 : 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,58,237,0.28), transparent 70%)",
              filter: "blur(16px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -30,
              left: -20,
              width: isMobile ? 120 : 180,
              height: isMobile ? 120 : 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56,189,248,0.18), transparent 70%)",
              filter: "blur(14px)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: isMobile ? 12 : 10 }}>
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
              DARK PREMIUM EXPERIENCE
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: heroTitleSize,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                lineHeight: 1.05,
                color: "#F8FAFC",
              }}
            >
              Dashboard Premium
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: isMobile ? 14 : 15,
                lineHeight: 1.7,
                maxWidth: 760,
              }}
            >
              Interface confortável aos olhos, mais tecnológica e preparada para
              experiências visuais avançadas dentro do sistema jurídico.
            </p>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                flexDirection: isMobile ? "column" : "row",
                marginTop: 8,
              }}
            >
              <button
                className="jv-premium-btn"
                onClick={() => setShowModal(true)}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                Abrir modal premium
              </button>

              <button
                className="jv-premium-btn-secondary"
                onClick={() =>
                  setToast({
                    open: true,
                    message: "Toast premium exibido com sucesso.",
                    type: "info",
                  })
                }
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                Exibir toast
              </button>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
          }}
        >
          <PremiumCard
            title="Clientes ativos"
            value={data.clients}
            subtitle="Base ativa e organizada no sistema"
            compact={compact}
          />
          <PremiumCard
            title="Processos ativos"
            value={data.processes}
            subtitle="Acompanhamento centralizado do escritório"
            compact={compact}
          />
          <PremiumCard
            title="Prazos pendentes"
            value={data.pendingDeadlines}
            subtitle="Itens que merecem atenção operacional"
            compact={compact}
          />
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isMobile || isTablet ? "1fr" : "1.5fr 1fr",
            gap: 18,
          }}
        >
          <div
            style={{
              borderRadius: isMobile ? 22 : 24,
              padding: isMobile ? 18 : 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                flexDirection: isMobile ? "column" : "row",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: "#F8FAFC" }}>
                  Próximos prazos
                </div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                  Vista rápida dos vencimentos pendentes
                </div>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(245,158,11,0.12)",
                  color: "#FCD34D",
                  fontSize: 12,
                  fontWeight: 800,
                  border: "1px solid rgba(245,158,11,0.18)",
                  whiteSpace: "nowrap",
                }}
              >
                {data.pendingDeadlines} pendente(s)
              </div>
            </div>

            {data.recentDeadlines.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                  fontSize: isMobile ? 14 : 15,
                }}
              >
                Nenhum prazo pendente encontrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {data.recentDeadlines.map((deadline) => (
                  <div
                    key={deadline.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "flex-start" : "center",
                      flexDirection: isMobile ? "column" : "row",
                      gap: 12,
                      padding: isMobile ? 14 : 16,
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
                    }}
                  >
                    <div>
                      <div style={{ color: "#F8FAFC", fontWeight: 700 }}>
                        {deadline.title || "Prazo"}
                      </div>
                      <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                        Vencimento: {formatDate(deadline.dueDate)}
                      </div>
                    </div>

                    <span
                      style={{
                        whiteSpace: "nowrap",
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: "rgba(245,158,11,0.12)",
                        color: "#FCD34D",
                        border: "1px solid rgba(245,158,11,0.18)",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      Pendente
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              borderRadius: isMobile ? 22 : 24,
              padding: isMobile ? 18 : 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
              backdropFilter: "blur(14px)",
              display: "grid",
              gap: 14,
              alignContent: "start",
            }}
          >
            <div>
              <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: "#F8FAFC" }}>
                Camada interativa
              </div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                Motion, popup e feedback visual do produto
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 18,
                background: "rgba(99,102,241,0.10)",
                border: "1px solid rgba(99,102,241,0.18)",
                color: "#C7D2FE",
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Agora o JuridicVas já possui uma base real para modais premium, ações
              confirmatórias e feedback visual elegante.
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 18,
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.16)",
                color: "#BAE6FD",
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Na próxima fase, aplicamos essa mesma experiência em clientes, processos,
              usuários e fluxos operacionais do sistema.
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
