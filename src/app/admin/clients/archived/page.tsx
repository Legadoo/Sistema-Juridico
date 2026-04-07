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

type Client = {
  id: string;
  name: string;
  document: string;
};

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function formatDocument(value: string) {
  const digits = onlyDigits(value);

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

function normalizeMe(data: MeResponse): Me | null {
  if (!data?.ok || !data?.user) return null;

  return {
    name: data.user.name ?? "Usuário",
    role: data.user.role ?? "SECRETARY",
  };
}

export default function ArchivedClientsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
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

    const response = await fetch("/api/admin/clients/archived", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    if (response?.ok && Array.isArray(response.clients)) {
      setClients(response.clients);
    } else {
      setClients([]);
    }

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
        Carregando clientes arquivados...
      </div>
    );
  }

  return (
    <AdminShell role={me?.role ?? "SECRETARY"} userName={me?.name ?? "Usuário"}>
      <PremiumToast
        open={toastOpen}
        message="Tela de arquivados carregada com o novo padrão visual premium."
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
              Clientes arquivados
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
              Histórico visualmente organizado dos clientes removidos da lista ativa.
            </p>

            <div style={{ marginTop: 6 }}>
              <button className="jv-premium-btn-secondary" onClick={() => setToastOpen(true)}>
                Ver feedback visual
              </button>
            </div>
          </div>
        </section>

        <section
          className="jv-glass"
          style={{
            borderRadius: 28,
            padding: 22,
          }}
        >
          {loading ? (
            <div style={{ color: "#94A3B8" }}>Carregando...</div>
          ) : clients.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94A3B8",
              }}
            >
              Nenhum cliente arquivado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {clients.map((client) => (
                <div
                  key={client.id}
                  style={{
                    borderRadius: 22,
                    padding: 18,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
                  }}
                >
                  <div style={{ color: "#F8FAFC", fontWeight: 800, fontSize: 18 }}>
                    {client.name}
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: 14, marginTop: 8 }}>
                    {formatDocument(client.document)}
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
