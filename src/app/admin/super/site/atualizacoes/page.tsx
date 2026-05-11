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

type PublicUpdatePost = {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  isPublished: boolean;
  isHighlighted: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type UpdatesResponse = {
  ok?: boolean;
  data?: PublicUpdatePost[];
  message?: string;
};

const emptyUpdateForm = {
  title: "",
  summary: "",
  category: "Novidade",
  publishedAt: "",
  isPublished: true,
  isHighlighted: false,
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
  minHeight: 130,
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

function formatDateForInput(value: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value: string) {
  if (!value) return "Sem data";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return date.toLocaleDateString("pt-BR");
}

export default function SuperSiteUpdatesPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<PublicUpdatePost[]>([]);
  const [form, setForm] = useState(emptyUpdateForm);
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
    setForm(emptyUpdateForm);
    setEditingId(null);
  }

  async function loadUpdates(ignore = false) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site/updates", {
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as UpdatesResponse | null;

      if (!response.ok || !data?.ok) {
        if (!ignore) {
          showToast(data?.message || "Não foi possível carregar as atualizações.", "error");
        }

        return;
      }

      if (!ignore) {
        setUpdates(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      if (!ignore) {
        showToast("Falha ao carregar atualizações do site público.", "error");
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

      await loadUpdates(ignore);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  function editUpdate(item: PublicUpdatePost) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      summary: item.summary,
      category: item.category,
      publishedAt: formatDateForInput(item.publishedAt),
      isPublished: item.isPublished,
      isHighlighted: item.isHighlighted,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveUpdate() {
    if (!form.title.trim()) {
      showToast("Informe o título da atualização.", "warning");
      return;
    }

    if (!form.summary.trim()) {
      showToast("Informe o resumo da atualização.", "warning");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? "/api/admin/site/updates/" + editingId
        : "/api/admin/site/updates";

      const method = editingId ? "PUT" : "POST";

      const payload = {
        ...form,
        publishedAt: form.publishedAt
          ? new Date(form.publishedAt + "T12:00:00").toISOString()
          : new Date().toISOString(),
      };

      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível salvar a atualização.", "error");
        return;
      }

      showToast(
        editingId
          ? "Atualização editada com sucesso."
          : "Atualização criada com sucesso.",
        "success"
      );

      resetForm();
      await loadUpdates();
    } catch {
      showToast("Falha ao salvar atualização.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUpdate(item: PublicUpdatePost) {
    const confirmed = window.confirm("Deseja excluir esta atualização do site público?");
    if (!confirmed) return;

    setDeletingId(item.id);

    try {
      const response = await fetch("/api/admin/site/updates/" + item.id, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível excluir a atualização.", "error");
        return;
      }

      if (editingId === item.id) {
        resetForm();
      }

      showToast("Atualização excluída com sucesso.", "success");
      await loadUpdates();
    } catch {
      showToast("Falha ao excluir atualização.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function togglePublished(item: PublicUpdatePost) {
    try {
      const response = await fetch("/api/admin/site/updates/" + item.id, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          summary: item.summary,
          category: item.category,
          publishedAt: item.publishedAt,
          isPublished: !item.isPublished,
          isHighlighted: item.isHighlighted,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível alterar o status.", "error");
        return;
      }

      showToast(
        !item.isPublished
          ? "Atualização publicada no site."
          : "Atualização ocultada do site.",
        "success"
      );

      await loadUpdates();
    } catch {
      showToast("Falha ao alterar status da atualização.", "error");
    }
  }

  if (!me) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#05070d",
          color: "#E2E8F0",
          padding: 24,
          textAlign: "center",
        }}
      >
        Carregando atualizações do site público...
      </div>
    );
  }

  const publishedCount = updates.filter((item) => item.isPublished).length;
  const hiddenCount = updates.length - publishedCount;
  const highlightedCount = updates.filter((item) => item.isHighlighted).length;

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
            background:
              "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(15,23,42,0.94) 45%, rgba(99,102,241,0.12))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                color: "#CFFAFE",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: "0.08em",
              }}
            >
              SITE PÚBLICO · ATUALIZAÇÕES
            </div>

            <h1
              style={{
                margin: 0,
                color: "#F8FAFC",
                fontSize: 36,
                fontWeight: 950,
                letterSpacing: "-0.05em",
              }}
            >
              Atualizações do site público
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                lineHeight: 1.8,
                maxWidth: 900,
              }}
            >
              Cadastre novidades, melhorias, lançamentos e avisos que aparecem na
              seção de atualizações da landing pública.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a
                href="/admin/super/site"
                className="jv-premium-btn-secondary"
                style={{ textDecoration: "none" }}
              >
                Voltar ao Site Público
              </a>

              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="jv-premium-btn"
                style={{ textDecoration: "none" }}
              >
                Ver site
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
            ["Total", updates.length],
            ["Publicadas", publishedCount],
            ["Ocultas", hiddenCount],
            ["Destaques", highlightedCount],
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
                  fontWeight: 900,
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
              {editingId ? "Editar atualização" : "Nova atualização"}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Use títulos claros e resumos curtos para apresentar novidades no site público.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            <Field label="Título">
              <input
                type="text"
                style={inputStyle}
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Nova melhoria no painel"
              />
            </Field>

            <Field label="Categoria">
              <input
                type="text"
                style={inputStyle}
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="Novidade"
              />
            </Field>

            <Field label="Data de publicação">
              <input
                type="date"
                style={inputStyle}
                value={form.publishedAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, publishedAt: event.target.value }))
                }
              />
            </Field>
          </div>

          <Field label="Resumo">
            <textarea
              style={textAreaStyle}
              value={form.summary}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, summary: event.target.value }))
              }
              placeholder="Explique em poucas linhas o que mudou ou foi lançado."
            />
          </Field>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "#E2E8F0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isPublished: event.target.checked,
                  }))
                }
              />
              Mostrar no site público
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                checked={form.isHighlighted}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isHighlighted: event.target.checked,
                  }))
                }
              />
              Destacar atualização
            </label>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button
              type="button"
              className="jv-premium-btn"
              onClick={saveUpdate}
              disabled={saving || loading}
            >
              {saving
                ? "Salvando..."
                : editingId
                ? "Salvar alterações"
                : "Criar atualização"}
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
              onClick={() => void loadUpdates()}
              disabled={saving || loading}
            >
              Recarregar
            </button>
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
              Atualizações cadastradas
            </h2>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Apenas atualizações publicadas aparecem no site público.
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
              Carregando atualizações...
            </div>
          ) : updates.length === 0 ? (
            <div
              className="jv-premium-card"
              style={{
                borderRadius: 22,
                padding: 22,
                color: "#CBD5E1",
                lineHeight: 1.8,
              }}
            >
              Nenhuma atualização cadastrada ainda.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
              }}
            >
              {updates.map((item) => (
                <article
                  key={item.id}
                  className="jv-premium-card"
                  style={{
                    borderRadius: 24,
                    padding: 18,
                    display: "grid",
                    gap: 14,
                    opacity: item.isPublished ? 1 : 0.72,
                  }}
                >
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "6px 9px",
                          fontSize: 11,
                          fontWeight: 900,
                          color: "#A5F3FC",
                          background: "rgba(34,211,238,0.10)",
                          border: "1px solid rgba(34,211,238,0.18)",
                        }}
                      >
                        {item.category}
                      </span>

                      <span
                        style={{
                          borderRadius: 999,
                          padding: "6px 9px",
                          fontSize: 11,
                          fontWeight: 900,
                          color: item.isPublished ? "#A7F3D0" : "#FCA5A5",
                          background: item.isPublished
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(239,68,68,0.12)",
                          border: item.isPublished
                            ? "1px solid rgba(16,185,129,0.22)"
                            : "1px solid rgba(239,68,68,0.22)",
                        }}
                      >
                        {item.isPublished ? "PUBLICADA" : "OCULTA"}
                      </span>

                      {item.isHighlighted ? (
                        <span
                          style={{
                            borderRadius: 999,
                            padding: "6px 9px",
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#FDE68A",
                            background: "rgba(245,158,11,0.12)",
                            border: "1px solid rgba(245,158,11,0.22)",
                          }}
                        >
                          DESTAQUE
                        </span>
                      ) : null}
                    </div>

                    <h3
                      style={{
                        margin: 0,
                        color: "#F8FAFC",
                        fontSize: 19,
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
                      {item.summary}
                    </p>

                    <div style={{ color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                      Publicação: {formatDateForDisplay(item.publishedAt)}
                    </div>
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
                      onClick={() => editUpdate(item)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="jv-premium-btn-secondary"
                      onClick={() => void togglePublished(item)}
                    >
                      {item.isPublished ? "Ocultar" : "Publicar"}
                    </button>

                    <button
                      type="button"
                      className="jv-premium-btn-secondary"
                      onClick={() => void deleteUpdate(item)}
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
