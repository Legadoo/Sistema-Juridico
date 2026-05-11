"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import SuperAdminShell from "@/components/SuperAdminShell";
import PremiumToast from "@/components/PremiumToast";
import { fetchMeOrRedirect } from "@/lib/superadmin/clientGuard";

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type LandingFeature = {
  id: string;
  title: string;
  description: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type FeaturesResponse = {
  ok?: boolean;
  data?: LandingFeature[];
  message?: string;
};

const emptyFeatureForm = {
  title: "",
  description: "",
  icon: "⚖️",
  sortOrder: 0,
  isActive: true,
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
  minHeight: 120,
  resize: "vertical",
  lineHeight: 1.6,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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

function FeaturePreview({
  form,
}: {
  form: typeof emptyFeatureForm;
}) {
  return (
    <div
      className="jv-premium-card"
      style={{
        borderRadius: 26,
        padding: 22,
        minHeight: 230,
        display: "grid",
        alignContent: "space-between",
        gap: 22,
        background:
          "linear-gradient(135deg, rgba(34,211,238,0.10), rgba(15,23,42,0.92) 45%, rgba(99,102,241,0.10))",
      }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 18,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
            fontSize: 24,
          }}
        >
          {form.icon || "✨"}
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              color: "#F8FAFC",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            {form.title || "Título da funcionalidade"}
          </h3>

          <p
            style={{
              margin: "10px 0 0",
              color: "#94A3B8",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            {form.description ||
              "Descrição profissional da funcionalidade que será exibida no site público."}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            width: "fit-content",
            borderRadius: 999,
            padding: "7px 10px",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.04em",
            color: form.isActive ? "#A7F3D0" : "#FCA5A5",
            background: form.isActive
              ? "rgba(16,185,129,0.12)"
              : "rgba(239,68,68,0.12)",
            border: form.isActive
              ? "1px solid rgba(16,185,129,0.22)"
              : "1px solid rgba(239,68,68,0.22)",
          }}
        >
          {form.isActive ? "PUBLICADA" : "OCULTA"}
        </span>

        <span
          style={{
            color: "#64748B",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Ordem {form.sortOrder || 0}
        </span>
      </div>
    </div>
  );
}

export default function SuperSiteFeaturesPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<LandingFeature[]>([]);
  const [form, setForm] = useState(emptyFeatureForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  function showToast(message: string, type: ToastState["type"]) {
    setToast({ open: true, message, type });
  }

  function resetForm() {
    setForm(emptyFeatureForm);
    setEditingId(null);
  }

  async function loadFeatures(ignore = false) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site/features", {
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as FeaturesResponse | null;

      if (!response.ok || !data?.ok) {
        if (!ignore) {
          showToast(data?.message || "Não foi possível carregar as funcionalidades.", "error");
        }
        return;
      }

      if (!ignore) {
        setFeatures(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      if (!ignore) {
        showToast("Falha ao carregar funcionalidades do site público.", "error");
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

      await loadFeatures(ignore);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  function editFeature(item: LandingFeature) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      icon: item.icon || "⚖️",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveFeature() {
    if (!form.title.trim()) {
      showToast("Informe o título da funcionalidade.", "warning");
      return;
    }

    if (!form.description.trim()) {
      showToast("Informe a descrição da funcionalidade.", "warning");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? "/api/admin/site/features/" + editingId
        : "/api/admin/site/features";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível salvar a funcionalidade.", "error");
        return;
      }

      showToast(
        editingId
          ? "Funcionalidade atualizada com sucesso."
          : "Funcionalidade criada com sucesso.",
        "success"
      );

      resetForm();
      await loadFeatures();
    } catch {
      showToast("Falha ao salvar funcionalidade.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFeature(item: LandingFeature) {
    const confirmed = window.confirm(
      "Deseja excluir esta funcionalidade do site público?"
    );

    if (!confirmed) return;

    setDeletingId(item.id);

    try {
      const response = await fetch("/api/admin/site/features/" + item.id, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível excluir a funcionalidade.", "error");
        return;
      }

      if (editingId === item.id) {
        resetForm();
      }

      showToast("Funcionalidade excluída com sucesso.", "success");
      await loadFeatures();
    } catch {
      showToast("Falha ao excluir funcionalidade.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleFeature(item: LandingFeature) {
    try {
      const response = await fetch("/api/admin/site/features/" + item.id, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          icon: item.icon || "",
          sortOrder: item.sortOrder,
          isActive: !item.isActive,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível alterar o status.", "error");
        return;
      }

      showToast(
        !item.isActive
          ? "Funcionalidade publicada no site."
          : "Funcionalidade ocultada do site.",
        "success"
      );

      await loadFeatures();
    } catch {
      showToast("Falha ao alterar status da funcionalidade.", "error");
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
        Carregando funcionalidades do site público...
      </div>
    );
  }

  const activeCount = features.filter((item) => item.isActive).length;
  const inactiveCount = features.length - activeCount;

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
          <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 14 }}>
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
                fontWeight: 800,
                letterSpacing: "0.04em",
              }}
            >
              SITE PÚBLICO · FUNCIONALIDADES
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
              Gerencie as funcionalidades exibidas na landing page
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
              Cadastre os recursos que aparecem no site público, controle a ordem,
              publique ou oculte itens e mantenha a apresentação comercial do sistema
              com aparência premium.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 4,
              }}
            >
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="jv-premium-btn"
                style={{ textDecoration: "none" }}
              >
                Ver site público
              </a>

              <a
                href="/admin/super/site"
                className="jv-premium-btn-secondary"
                style={{ textDecoration: "none" }}
              >
                Voltar ao editor geral
              </a>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {[
            ["Total", features.length],
            ["Publicadas", activeCount],
            ["Ocultas", inactiveCount],
          ].map(([label, value]) => (
            <div
              key={label}
              className="jv-premium-card"
              style={{
                borderRadius: 22,
                padding: 20,
              }}
            >
              <div
                style={{
                  color: "#94A3B8",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontWeight: 800,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: "#F8FAFC",
                  fontSize: 30,
                  fontWeight: 950,
                  letterSpacing: "-0.05em",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </section>

        <section
          className="jv-glass"
          style={{
            borderRadius: 28,
            padding: 22,
            display: "grid",
            gap: 20,
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2
              style={{
                margin: 0,
                color: "#F8FAFC",
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              {editingId ? "Editar funcionalidade" : "Nova funcionalidade"}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Use títulos curtos e descrições comerciais. O resultado aparece no bloco
              “Funcionalidades” do site público.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
              gap: 20,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 140px",
                  gap: 14,
                }}
              >
                <Field label="Título">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    style={inputStyle}
                    placeholder="Gestão de processos"
                  />
                </Field>

                <Field label="Ícone">
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, icon: e.target.value }))
                    }
                    style={{
                      ...inputStyle,
                      textAlign: "center",
                      fontSize: 22,
                    }}
                    placeholder="⚖️"
                  />
                </Field>
              </div>

              <Field label="Descrição">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  style={textAreaStyle}
                  placeholder="Centralize processos, prazos e movimentações em um ambiente moderno e organizado."
                />
              </Field>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px minmax(0, 1fr)",
                  gap: 14,
                  alignItems: "end",
                }}
              >
                <Field label="Ordem">
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        sortOrder: Number(e.target.value),
                      }))
                    }
                    style={inputStyle}
                  />
                </Field>

                <Field label="Publicação">
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
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                    />
                    Mostrar no site público
                  </label>
                </Field>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button
                  type="button"
                  className="jv-premium-btn"
                  onClick={saveFeature}
                  disabled={saving || loading}
                >
                  {saving
                    ? "Salvando..."
                    : editingId
                    ? "Salvar alterações"
                    : "Criar funcionalidade"}
                </button>

                {editingId ? (
                  <button
                    type="button"
                    className="jv-premium-btn-secondary"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Cancelar edição
                  </button>
                ) : null}

                <button
                  type="button"
                  className="jv-premium-btn-secondary"
                  onClick={() => void loadFeatures()}
                  disabled={saving || loading}
                >
                  Recarregar
                </button>
              </div>
            </div>

            <FeaturePreview form={form} />
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
          <div style={{ display: "grid", gap: 6 }}>
            <h2
              style={{
                margin: 0,
                color: "#F8FAFC",
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              Funcionalidades cadastradas
            </h2>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Apenas funcionalidades ativas aparecem no site público.
            </p>
          </div>

          {loading ? (
            <div
              className="jv-premium-card"
              style={{
                borderRadius: 22,
                padding: 22,
                color: "#CBD5E1",
              }}
            >
              Carregando funcionalidades...
            </div>
          ) : features.length === 0 ? (
            <div
              className="jv-premium-card"
              style={{
                borderRadius: 22,
                padding: 22,
                color: "#CBD5E1",
                lineHeight: 1.8,
              }}
            >
              Nenhuma funcionalidade cadastrada ainda. Crie a primeira acima para
              alimentar o bloco de funcionalidades do site público.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {features.map((item) => (
                <article
                  key={item.id}
                  className="jv-premium-card"
                  style={{
                    borderRadius: 24,
                    padding: 18,
                    display: "grid",
                    gap: 16,
                    opacity: item.isActive ? 1 : 0.72,
                  }}
                >
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 22,
                        flex: "0 0 auto",
                      }}
                    >
                      {item.icon || "✨"}
                    </div>

                    <div style={{ minWidth: 0, display: "grid", gap: 8 }}>
                      <h3
                        style={{
                          margin: 0,
                          color: "#F8FAFC",
                          fontSize: 18,
                          fontWeight: 900,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {item.title}
                      </h3>

                      <p
                        style={{
                          margin: 0,
                          color: "#94A3B8",
                          fontSize: 13,
                          lineHeight: 1.75,
                        }}
                      >
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "6px 9px",
                        fontSize: 11,
                        fontWeight: 900,
                        color: item.isActive ? "#A7F3D0" : "#FCA5A5",
                        background: item.isActive
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(239,68,68,0.12)",
                        border: item.isActive
                          ? "1px solid rgba(16,185,129,0.22)"
                          : "1px solid rgba(239,68,68,0.22)",
                      }}
                    >
                      {item.isActive ? "PUBLICADA" : "OCULTA"}
                    </span>

                    <span
                      style={{
                        borderRadius: 999,
                        padding: "6px 9px",
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#CBD5E1",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      ORDEM {item.sortOrder}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="jv-premium-btn-secondary"
                      onClick={() => editFeature(item)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="jv-premium-btn-secondary"
                      onClick={() => void toggleFeature(item)}
                    >
                      {item.isActive ? "Ocultar" : "Publicar"}
                    </button>

                    <button
                      type="button"
                      className="jv-premium-btn-secondary"
                      onClick={() => void deleteFeature(item)}
                      disabled={deletingId === item.id}
                      style={{
                        gridColumn: "1 / -1",
                        color: "#FCA5A5",
                      }}
                    >
                      {deletingId === item.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </SuperAdminShell>
  );
}
