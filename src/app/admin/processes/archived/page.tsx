"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import PremiumToast from "@/components/PremiumToast";

type MeResponse = {
  ok?: boolean;
  user?: {
    name?: string;
    role?: string;
  };
};

type Me = {
  name: string;
  role: string;
};

type ProcessRow = {
  id: string;
  title?: string;
  cnj?: string;
  number?: string;
  processNumber?: string;
  createdAt?: string;
  client?: {
    name?: string;
  };
};

function normalizeMe(data: MeResponse): Me | null {
  if (!data?.ok || !data?.user) return null;

  return {
    name: data.user.name ?? "Usuário",
    role: data.user.role ?? "SECRETARY",
  };
}

function formatDate(date?: string) {
  if (!date) return "Sem data";
  try {
    return new Date(date).toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
}

function getProcessNumber(process: ProcessRow) {
  return process.cnj || process.number || process.processNumber || "Sem número";
}

export default function ArchivedProcessesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastOpen, setToastOpen] = useState(false);

  async function load() {
    setLoading(true);

    const meResponse = await fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    const normalizedMe = normalizeMe(meResponse);
    if (!normalizedMe) {
      setLoading(false);
      return;
    }

    setMe(normalizedMe);

    const response = await fetch("/api/admin/processes/archived", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    const list =
      Array.isArray(response?.processes) ? response.processes :
      Array.isArray(response) ? response :
      [];

    setProcesses(list);
    setLoading(false);
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

  if (!me && loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
          color: "#E2E8F0",
        }}
      >
        Carregando processos arquivados...
      </div>
    );
  }

  return (
    <AdminShell role={me?.role ?? "SECRETARY"} userName={me?.name ?? "Usuário"}>
      <PremiumToast
        open={toastOpen}
        message="Tela de processos arquivados carregada no padrão premium."
        type="info"
        onClose={() => setToastOpen(false)}
      />

      <div style={{ display: "grid", gap: 24 }}>
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.14), rgba(15,23,42,0.88) 45%, rgba(56,189,248,0.08))",
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
                color: "#BFDBFE",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              ARQUIVADOS
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                color: "#F8FAFC",
              }}
            >
              Processos arquivados
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
              Histórico organizado dos processos removidos da lista ativa, com a mesma identidade premium do painel.
            </p>

            <div style={{ marginTop: 6 }}>
              <button className="jv-premium-btn-secondary" onClick={() => setToastOpen(true)}>
                Ver feedback visual
              </button>
            </div>
          </div>
        </section>

        <section className="jv-glass" style={{ borderRadius: 28, padding: 22 }}>
          {loading ? (
            <div style={{ color: "#94A3B8" }}>Carregando...</div>
          ) : processes.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94A3B8",
              }}
            >
              Nenhum processo arquivado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {processes.map((process) => (
                <div
                  key={process.id}
                  style={{
                    borderRadius: 22,
                    padding: 18,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ color: "#F8FAFC", fontWeight: 800, fontSize: 18 }}>
                    {process.title || "Processo"}
                  </div>

                  <div style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>
                    {getProcessNumber(process)}
                  </div>

                  <div style={{ color: "#64748B", fontSize: 13, marginTop: 8 }}>
                    Cliente: {process.client?.name || "Não vinculado"}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "inline-flex",
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "rgba(56,189,248,0.08)",
                      color: "#BAE6FD",
                      border: "1px solid rgba(56,189,248,0.16)",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    Arquivado em {formatDate(process.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
