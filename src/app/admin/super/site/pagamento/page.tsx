"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import SuperAdminShell from "@/components/SuperAdminShell";
import PremiumToast from "@/components/PremiumToast";
import { fetchMeOrRedirect } from "@/lib/superadmin/clientGuard";

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type PublicSitePaymentConfig = {
  id?: string;
  provider?: string;
  isActive: boolean;
  hasAccessToken?: boolean;
  hasPublicKey?: boolean;
  publicKey?: string;
};

type PaymentConfigResponse = {
  ok?: boolean;
  data?: PublicSitePaymentConfig | null;
  message?: string;
};

const inputStyle: CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#F8FAFC",
  borderRadius: 16,
  padding: "14px 16px",
  outline: "none",
  boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 800 }}>{label}</label>
      {children}
    </div>
  );
}

export default function SuperSitePaymentPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [info, setInfo] = useState<PublicSitePaymentConfig | null>(null);
  const [form, setForm] = useState({
    accessToken: "",
    publicKey: "",
    isActive: false,
  });

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  function showToast(message: string, type: ToastState["type"]) {
    setToast({ open: true, message, type });
  }

  async function loadPayment(ignore = false) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site/payment-config", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as PaymentConfigResponse | null;

      if (!response.ok || !data?.ok) {
        if (!ignore) showToast(data?.message || "Não foi possível carregar o pagamento.", "error");
        return;
      }

      if (!ignore) {
        setInfo(data.data || null);
        setForm({
          accessToken: "",
          publicKey: data.data?.publicKey || "",
          isActive: data.data?.isActive || false,
        });
      }
    } catch {
      if (!ignore) showToast("Falha ao carregar pagamento público.", "error");
    } finally {
      if (!ignore) setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      const currentUser = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!currentUser) return;

      await loadPayment(ignore);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  async function savePayment() {
    if (!form.accessToken.trim()) {
      showToast("Informe o Access Token do Mercado Pago para salvar.", "warning");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/site/payment-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível salvar o pagamento.", "error");
        return;
      }

      showToast("Pagamento público salvo com sucesso.", "success");
      await loadPayment();
    } catch {
      showToast("Falha ao salvar pagamento público.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!me) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05070d", color: "#E2E8F0" }}>
        Carregando pagamento público...
      </div>
    );
  }

  return (
    <SuperAdminShell userName={me.name}>
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <div style={{ display: "grid", gap: 24 }}>
        <section
          style={{
            borderRadius: 28,
            padding: 28,
            background: "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(15,23,42,0.94) 45%, rgba(99,102,241,0.12))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ color: "#CFFAFE", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em" }}>
              SITE PÚBLICO · PAGAMENTO
            </div>

            <h1 style={{ margin: 0, color: "#F8FAFC", fontSize: 36, fontWeight: 950, letterSpacing: "-0.05em" }}>
              Pagamento do site público
            </h1>

            <p style={{ margin: 0, color: "#94A3B8", lineHeight: 1.8, maxWidth: 900 }}>
              Configure o Mercado Pago usado no checkout dos planos públicos do SaaS.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a href="/admin/super/site" className="jv-premium-btn-secondary" style={{ textDecoration: "none" }}>
                Voltar ao Site Público
              </a>
              <a href="/" target="_blank" rel="noreferrer" className="jv-premium-btn" style={{ textDecoration: "none" }}>
                Ver site
              </a>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <div className="jv-premium-card" style={{ borderRadius: 22, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900, letterSpacing: "0.12em" }}>PROVEDOR</div>
            <div style={{ marginTop: 10, color: "#F8FAFC", fontSize: 22, fontWeight: 950 }}>
              {info?.provider || "MERCADO_PAGO"}
            </div>
          </div>

          <div className="jv-premium-card" style={{ borderRadius: 22, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900, letterSpacing: "0.12em" }}>STATUS</div>
            <div style={{ marginTop: 10, color: info?.isActive ? "#A7F3D0" : "#FCA5A5", fontSize: 22, fontWeight: 950 }}>
              {loading ? "Carregando" : info?.isActive ? "Ativo" : "Inativo"}
            </div>
          </div>

          <div className="jv-premium-card" style={{ borderRadius: 22, padding: 20 }}>
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900, letterSpacing: "0.12em" }}>TOKEN</div>
            <div style={{ marginTop: 10, color: info?.hasAccessToken ? "#A7F3D0" : "#FCA5A5", fontSize: 22, fontWeight: 950 }}>
              {info?.hasAccessToken ? "Cadastrado" : "Não cadastrado"}
            </div>
          </div>
        </section>

        <section className="jv-glass" style={{ borderRadius: 28, padding: 22, display: "grid", gap: 18 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={{ margin: 0, color: "#F8FAFC", fontSize: 24, fontWeight: 900 }}>
              Credenciais do Mercado Pago
            </h2>

            <p style={{ margin: 0, color: "#94A3B8", fontSize: 14, lineHeight: 1.7 }}>
              Por segurança, o Access Token não é exibido após salvo. Para alterar qualquer configuração,
              informe novamente o Access Token.
            </p>
          </div>

          <Field label="Access Token">
            <input
              type="password"
              style={inputStyle}
              value={form.accessToken}
              onChange={(e) => setForm((p) => ({ ...p, accessToken: e.target.value }))}
              placeholder={info?.hasAccessToken ? "Token já cadastrado. Digite um novo para atualizar." : "Cole o Access Token"}
            />
          </Field>

          <Field label="Public Key">
            <input
              style={inputStyle}
              value={form.publicKey}
              onChange={(e) => setForm((p) => ({ ...p, publicKey: e.target.value }))}
              placeholder="Cole a Public Key"
            />
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#E2E8F0" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Ativar checkout público
          </label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button className="jv-premium-btn" onClick={savePayment} disabled={saving}>
              {saving ? "Validando e salvando..." : "Salvar pagamento público"}
            </button>

            <button className="jv-premium-btn-secondary" onClick={() => void loadPayment()} disabled={saving}>
              Recarregar
            </button>
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}
