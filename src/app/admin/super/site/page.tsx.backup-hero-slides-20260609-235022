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

type LandingConfig = {
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryButtonText: string;
  heroSecondaryButtonText: string;
  aboutTitle: string;
  aboutText: string;
  featuresTitle: string;
  featuresSubtitle: string;
  mediaTitle: string;
  mediaSubtitle: string;
  plansTitle: string;
  plansSubtitle: string;
  updatesTitle: string;
  updatesSubtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  footerText: string;
  loginUrl: string;
  trackUrl: string;
  isPublished: boolean;
};

type AdminSiteResponse = {
  ok?: boolean;
  data?: {
    config?: Partial<LandingConfig>;
  };
  message?: string;
};

const emptyConfig: LandingConfig = {
  brandName: "",
  heroTitle: "",
  heroSubtitle: "",
  heroPrimaryButtonText: "",
  heroSecondaryButtonText: "",
  aboutTitle: "",
  aboutText: "",
  featuresTitle: "",
  featuresSubtitle: "",
  mediaTitle: "",
  mediaSubtitle: "",
  plansTitle: "",
  plansSubtitle: "",
  updatesTitle: "",
  updatesSubtitle: "",
  ctaTitle: "",
  ctaSubtitle: "",
  footerText: "",
  loginUrl: "/login",
  trackUrl: "/acompanhar",
  isPublished: true,
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

const textAreaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 110,
  resize: "vertical",
  lineHeight: 1.6,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label
        style={{
          color: "#CBD5E1",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </label>

      {children}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      className="jv-glass"
      style={{
        borderRadius: 28,
        padding: 22,
        display: "grid",
        gap: 18,
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <h2
          style={{
            margin: 0,
            color: "#F8FAFC",
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: 0,
            color: "#94A3B8",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

export default function SuperSitePage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [config, setConfig] = useState<LandingConfig>(emptyConfig);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  function showToast(message: string, type: ToastState["type"]) {
    setToast({ open: true, message, type });
  }

  async function loadSiteData(ignore = false) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site", {
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as AdminSiteResponse | null;

      if (!response.ok || !data?.ok) {
        if (!ignore) {
          showToast(data?.message || "Não foi possível carregar as configurações gerais.", "error");
        }

        return;
      }

      if (!ignore) {
        setConfig({
          ...emptyConfig,
          ...(data.data?.config ?? {}),
        });
      }
    } catch {
      if (!ignore) {
        showToast("Falha ao carregar configurações gerais do site público.", "error");
      }
    } finally {
      if (!ignore) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      const currentUser = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!currentUser) return;

      await loadSiteData(ignore);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  async function saveConfig() {
    if (!config.brandName.trim()) {
      showToast("Informe o nome da marca.", "warning");
      return;
    }

    if (!config.heroTitle.trim()) {
      showToast("Informe o título principal.", "warning");
      return;
    }

    if (!config.heroSubtitle.trim()) {
      showToast("Informe o subtítulo principal.", "warning");
      return;
    }

    setSavingConfig(true);

    try {
      const response = await fetch("/api/admin/site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Erro ao salvar configurações gerais.", "error");
        return;
      }

      showToast("Configurações gerais salvas com sucesso.", "success");
      await loadSiteData();
    } catch {
      showToast("Não foi possível salvar as configurações gerais.", "error");
    } finally {
      setSavingConfig(false);
    }
  }

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
        Carregando configurações gerais do site público...
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
            position: "relative",
            overflow: "hidden",
            borderRadius: 28,
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(15,23,42,0.94) 45%, rgba(99,102,241,0.12))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
            backdropFilter: "blur(16px)",
          }}
        >
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
                color: "#CFFAFE",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: "0.08em",
              }}
            >
              SITE PÚBLICO · CONFIGURAÇÕES GERAIS
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 36,
                fontWeight: 950,
                letterSpacing: "-0.05em",
                lineHeight: 1.05,
                color: "#F8FAFC",
              }}
            >
              Configurações gerais da landing pública
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 920,
              }}
            >
              Edite somente os textos principais, links, chamadas comerciais,
              títulos das seções e status de publicação. Funcionalidades, mídias,
              planos e pagamento ficam nas subcategorias do menu lateral.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="jv-premium-btn"
                style={{ textDecoration: "none" }}
              >
                Ver site público
              </a>

              <button
                type="button"
                className="jv-premium-btn-secondary"
                onClick={() => void loadSiteData()}
                disabled={loading || savingConfig}
              >
                Recarregar
              </button>
            </div>
          </div>
        </section>

        <SectionCard
          title="Identidade e publicação"
          description="Controle o nome da marca e se a landing pública está publicada."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <Field label="Nome da marca">
              <input
                type="text"
                value={config.brandName}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    brandName: event.target.value,
                  }))
                }
                style={inputStyle}
                placeholder="JURIDICVAS"
              />
            </Field>

            <Field label="Status da landing">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#E2E8F0",
                  minHeight: 52,
                }}
              >
                <input
                  type="checkbox"
                  checked={config.isPublished}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      isPublished: event.target.checked,
                    }))
                  }
                />
                Landing publicada
              </label>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Topo da landing"
          description="Textos principais exibidos na primeira dobra do site público."
        >
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Título principal">
              <textarea
                value={config.heroTitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    heroTitle: event.target.value,
                  }))
                }
                style={textAreaStyle}
              />
            </Field>

            <Field label="Subtítulo principal">
              <textarea
                value={config.heroSubtitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    heroSubtitle: event.target.value,
                  }))
                }
                style={textAreaStyle}
              />
            </Field>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 16,
              }}
            >
              <Field label="Texto do botão principal">
                <input
                  type="text"
                  value={config.heroPrimaryButtonText}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      heroPrimaryButtonText: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </Field>

              <Field label="Texto do botão secundário">
                <input
                  type="text"
                  value={config.heroSecondaryButtonText}
                  onChange={(event) =>
                    setConfig((prev) => ({
                      ...prev,
                      heroSecondaryButtonText: event.target.value,
                    }))
                  }
                  style={inputStyle}
                />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Sobre o sistema"
          description="Conteúdo institucional exibido na seção de apresentação da plataforma."
        >
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Título da seção Sobre">
              <input
                type="text"
                value={config.aboutTitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    aboutTitle: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Texto da seção Sobre">
              <textarea
                value={config.aboutText}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    aboutText: event.target.value,
                  }))
                }
                style={textAreaStyle}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Títulos das seções públicas"
          description="Defina os títulos e subtítulos das áreas que aparecem no site."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            <Field label="Título de funcionalidades">
              <input
                type="text"
                value={config.featuresTitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    featuresTitle: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Subtítulo de funcionalidades">
              <input
                type="text"
                value={config.featuresSubtitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    featuresSubtitle: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Título de mídias">
              <input
                type="text"
                value={config.mediaTitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    mediaTitle: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Subtítulo de mídias">
              <input
                type="text"
                value={config.mediaSubtitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    mediaSubtitle: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Título de planos">
              <input
                type="text"
                value={config.plansTitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    plansTitle: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Subtítulo de planos">
              <input
                type="text"
                value={config.plansSubtitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    plansSubtitle: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Título de atualizações">
              <input
                type="text"
                value={config.updatesTitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    updatesTitle: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Subtítulo de atualizações">
              <input
                type="text"
                value={config.updatesSubtitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    updatesSubtitle: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Chamada final e rodapé"
          description="Configure o CTA final da landing e o texto de rodapé."
        >
          <div style={{ display: "grid", gap: 16 }}>
            <Field label="Título da chamada final">
              <textarea
                value={config.ctaTitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    ctaTitle: event.target.value,
                  }))
                }
                style={textAreaStyle}
              />
            </Field>

            <Field label="Subtítulo da chamada final">
              <textarea
                value={config.ctaSubtitle}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    ctaSubtitle: event.target.value,
                  }))
                }
                style={textAreaStyle}
              />
            </Field>

            <Field label="Texto do rodapé">
              <input
                type="text"
                value={config.footerText}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    footerText: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          title="Links principais"
          description="Configure os destinos dos botões principais do site público."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <Field label="URL de login">
              <input
                type="text"
                value={config.loginUrl}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    loginUrl: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>

            <Field label="URL de acompanhamento">
              <input
                type="text"
                value={config.trackUrl}
                onChange={(event) =>
                  setConfig((prev) => ({
                    ...prev,
                    trackUrl: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </Field>
          </div>
        </SectionCard>

        <div
          className="jv-glass"
          style={{
            position: "sticky",
            bottom: 18,
            zIndex: 20,
            borderRadius: 24,
            padding: 16,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <strong style={{ color: "#F8FAFC", fontSize: 15 }}>
              Configurações gerais
            </strong>

            <p
              style={{
                margin: "4px 0 0",
                color: "#94A3B8",
                fontSize: 13,
              }}
            >
              Salve para publicar as alterações no site público.
            </p>
          </div>

          <button
            type="button"
            className="jv-premium-btn"
            onClick={saveConfig}
            disabled={savingConfig || loading}
          >
            {savingConfig ? "Salvando..." : "Salvar configurações gerais"}
          </button>
        </div>
      </div>
    </SuperAdminShell>
  );
}
