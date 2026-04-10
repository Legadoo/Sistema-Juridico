"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SuperAdminShell from "@/components/SuperAdminShell";
import { fetchMeOrRedirect } from "@/lib/superadmin/clientGuard";

type FirmItem = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  maxClients: number;
  usersCount: number;
  clientsCount: number;
  processesCount: number;
};

type FirmsResponse = {
  ok?: boolean;
  firms?: FirmItem[];
};

export default function SuperadminFirmsPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [firms, setFirms] = useState<FirmItem[]>([]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const me = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!me) return;

      const firmsRes = await fetch("/api/super/firms", { cache: "no-store" });

      if (firmsRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (firmsRes.ok) {
        const firmsJson = (await firmsRes.json()) as FirmsResponse;
        if (!ignore) {
          setFirms(firmsJson.firms ?? []);
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
        Carregando advocacias...
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
              "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(15,23,42,0.88) 45%, rgba(56,189,248,0.10))",
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
              GESTAO DE ADVOCACIAS
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
              Escritórios cadastrados na plataforma
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
              Visão central de todas as advocacias com plano operacional, volume de uso
              e ponto de entrada para gerenciamento por escritório.
            </p>
          </div>
        </section>

        <section
          style={{
            borderRadius: 24,
            padding: 22,
            background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
            backdropFilter: "blur(14px)",
            display: "grid",
            gap: 14,
          }}
        >
          {firms.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94A3B8",
                fontSize: 15,
              }}
            >
              Nenhuma advocacia encontrada.
            </div>
          ) : (
            firms.map((firm) => (
              <div
                key={firm.id}
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

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Plano atual</div>
                    <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{firm.maxClients} clientes</div>
                  </div>

                  <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Usuarios</div>
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
                  <Link
                    href={`/admin/super/firms/${firm.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 14,
                      padding: "10px 16px",
                      background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
                      color: "#fff",
                      textDecoration: "none",
                      fontWeight: 700,
                    }}
                  >
                    Gerenciar advocacia
                  </Link>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </SuperAdminShell>
  );
}