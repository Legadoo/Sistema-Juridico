"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";
import PremiumToast from "@/components/PremiumToast";

type MeResponse = {
  ok?: boolean;
  user?: {
    id?: string;
    name?: string;
    role?: string;
  };
};

type Me = {
  name: string;
  role: string;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#F8FAFC",
  borderRadius: 16,
  padding: "14px 16px",
  outline: "none",
  boxSizing: "border-box",
};

function normalizeMe(data: MeResponse): Me | null {
  if (!data?.ok || !data?.user) return null;

  return {
    name: data.user.name ?? "Usuário",
    role: data.user.role ?? "SECRETARY",
  };
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [maxClients, setMaxClients] = useState("");
  const [activeClients, setActiveClients] = useState(0);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const remaining = useMemo(() => {
    const max = Number(maxClients);
    if (!Number.isFinite(max) || max < 0) return 0;
    return Math.max(max - activeClients, 0);
  }, [maxClients, activeClients]);

  function showToast(message: string, type: ToastState["type"]) {
    setToast({ open: true, message, type });
  }

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

    const settingsResponse = await fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);

    if (settingsResponse?.ok) {
      setMaxClients(String(settingsResponse.config?.maxClients ?? 50));
      setActiveClients(Number(settingsResponse.activeClients ?? 0));
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

  async function saveSettings() {
    const parsed = Number(maxClients);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100000) {
      showToast("Informe um limite válido entre 1 e 100000.", "warning");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxClients: parsed }),
      }).then(async (r) => ({
        ok: r.ok,
        data: await r.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao salvar configurações.", "error");
        return;
      }

      await load();
      showToast("Configurações salvas com sucesso.", "success");
    } catch {
      showToast("Não foi possível salvar as configurações.", "error");
    } finally {
      setSaving(false);
    }
  }

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
        Carregando configurações...
      </div>
    );
  }

  return (
    <AdminShell role={me?.role ?? "SUPERADMIN"} userName={me?.name ?? "Usuário"}>
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

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
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -10,
              width: 180,
              height: 180,
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
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56,189,248,0.18), transparent 70%)",
              filter: "blur(14px)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 12 }}>
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
              CONFIGURAÇÕES DO SISTEMA
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: "-0.05em",
                    color: "#F8FAFC",
                  }}
                >
                  Configurações premium
                </h1>

                <p
                  style={{
                    margin: "10px 0 0",
                    color: "#94A3B8",
                    fontSize: 15,
                    lineHeight: 1.7,
                    maxWidth: 760,
                  }}
                >
                  Controle parâmetros globais do JuridicVas com uma experiência mais clara,
                  robusta e preparada para evolução comercial do produto.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div className="jv-glass" style={{ borderRadius: 24, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Clientes ativos</div>
            <div style={{ color: "#F8FAFC", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {activeClients}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Limite configurado</div>
            <div style={{ color: "#F8FAFC", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {maxClients || "—"}
            </div>
          </div>

          <div className="jv-glass" style={{ borderRadius: 24, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 13 }}>Vagas restantes</div>
            <div style={{ color: "#A7F3D0", fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {remaining}
            </div>
          </div>
        </section>

        <section
          className="jv-glass"
          style={{
            borderRadius: 28,
            padding: 22,
            display: "grid",
            gap: 18,
          }}
        >
          <div>
            <div style={{ color: "#F8FAFC", fontSize: 22, fontWeight: 800 }}>
              Limite de clientes ativos
            </div>
            <div style={{ color: "#64748B", fontSize: 13, marginTop: 6, lineHeight: 1.7 }}>
              Clientes arquivados não contam. Quando o limite for atingido, o sistema
              bloqueia a criação de novos clientes ativos.
            </div>
          </div>

          <div style={{ display: "grid", gap: 6, maxWidth: 380 }}>
            <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
              Máximo de clientes ativos
            </label>
            <input
              type="number"
              min={1}
              max={100000}
              value={maxClients}
              onChange={(e) => setMaxClients(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "#94A3B8",
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            Esta é a configuração global atualmente persistida no SystemConfig.
            Nas próximas fases, esta tela poderá receber branding, preferências do escritório
            e futuras regras de plano.
          </div>

          <div>
            <button
              className="jv-premium-btn"
              onClick={saveSettings}
              disabled={saving || loading}
            >
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
