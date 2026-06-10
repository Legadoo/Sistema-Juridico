"use client";

import { useEffect, useMemo, useState } from "react";
import SuperAdminShell from "@/components/SuperAdminShell";
import PremiumToast from "@/components/PremiumToast";
import { fetchMeOrRedirect } from "@/lib/superadmin/clientGuard";

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type HeroSlide = {
  id?: string;
  title: string;
  url: string;
  alt: string;
  sortOrder: number;
  isActive: boolean;
};

const emptySlide: HeroSlide = {
  title: "",
  url: "",
  alt: "",
  sortOrder: 0,
  isActive: true,
};

function normalizeSlide(slide: Partial<HeroSlide>, index: number): HeroSlide {
  return {
    id: slide.id,
    title: slide.title || `Slide ${index + 1}`,
    url: slide.url || "",
    alt: slide.alt || slide.title || `Imagem do hero ${index + 1}`,
    sortOrder: Number.isFinite(Number(slide.sortOrder)) ? Number(slide.sortOrder) : index,
    isActive: typeof slide.isActive === "boolean" ? slide.isActive : true,
  };
}

export default function SuperSitePage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [form, setForm] = useState<HeroSlide>(emptySlide);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const activeSlides = useMemo(() => {
    return slides.filter((slide) => slide.isActive && slide.url.trim());
  }, [slides]);

  function showToast(message: string, type: ToastState["type"]) {
    setToast({ open: true, message, type });
  }

  async function loadSlides() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site/hero-slides", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível carregar os slides.", "error");
        return;
      }

      const loadedSlides = Array.isArray(data.slides)
        ? data.slides.map((slide: Partial<HeroSlide>, index: number) =>
            normalizeSlide(slide, index)
          )
        : [];

      setSlides(loadedSlides);
    } catch {
      showToast("Falha ao carregar slides do hero.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function boot() {
      const currentUser = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!currentUser) return;

      if (!ignore) {
        await loadSlides();
      }
    }

    void boot();

    return () => {
      ignore = true;
    };
  }, []);

  function resetForm() {
    setForm({
      ...emptySlide,
      sortOrder: slides.length,
    });
    setEditingIndex(null);
  }

  function addOrUpdateSlide() {
    if (!form.url.trim()) {
      showToast("Informe a URL da imagem.", "warning");
      return;
    }

    const preparedSlide = normalizeSlide(
      {
        ...form,
        title: form.title.trim() || `Slide ${slides.length + 1}`,
        url: form.url.trim(),
        alt: form.alt.trim() || form.title.trim() || "Imagem do hero",
      },
      editingIndex ?? slides.length
    );

    if (editingIndex === null) {
      setSlides((prev) => [...prev, preparedSlide]);
      showToast("Slide adicionado. Clique em Salvar alterações para publicar.", "info");
    } else {
      setSlides((prev) =>
        prev.map((slide, index) => (index === editingIndex ? preparedSlide : slide))
      );
      showToast("Slide atualizado. Clique em Salvar alterações para publicar.", "info");
    }

    resetForm();
  }

  function editSlide(index: number) {
    setEditingIndex(index);
    setForm(slides[index]);
  }

  function removeSlide(index: number) {
    const confirmed = window.confirm("Deseja remover este slide?");
    if (!confirmed) return;

    setSlides((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    resetForm();
  }

  function moveSlide(index: number, direction: "up" | "down") {
    setSlides((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) return prev;

      const current = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = current;

      return next.map((slide, currentIndex) => ({
        ...slide,
        sortOrder: currentIndex,
      }));
    });
  }

  async function saveSlides() {
    setSaving(true);

    try {
      const response = await fetch("/api/admin/site/hero-slides", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slides: slides.map((slide, index) => ({
            title: slide.title,
            url: slide.url,
            alt: slide.alt,
            sortOrder: index,
            isActive: slide.isActive,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível salvar os slides.", "error");
        return;
      }

      showToast(data?.message || "Slides salvos com sucesso.", "success");
      await loadSlides();
    } catch {
      showToast("Falha ao salvar slides.", "error");
    } finally {
      setSaving(false);
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
        Carregando painel do site...
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

      <div className="jv-site-module">
        <style>{`
          .jv-site-module {
            display: grid;
            gap: 20px;
          }

          .jv-site-header,
          .jv-site-card {
            border-radius: 24px;
            padding: 22px;
          }

          .jv-site-header {
            position: relative;
            overflow: hidden;
          }

          .jv-site-title {
            color: #F8FAFC;
            font-size: 30px;
            font-weight: 950;
            letter-spacing: -0.04em;
            margin: 0;
          }

          .jv-site-subtitle {
            color: #94A3B8;
            margin-top: 8px;
            line-height: 1.7;
            max-width: 920px;
          }

          .jv-site-grid {
            display: grid;
            grid-template-columns: minmax(340px, 0.75fr) minmax(420px, 1.25fr);
            gap: 20px;
            align-items: start;
          }

          .jv-site-field {
            display: grid;
            gap: 7px;
          }

          .jv-site-label {
            color: #CBD5E1;
            font-size: 13px;
            font-weight: 850;
          }

          .jv-site-help {
            color: #94A3B8;
            font-size: 13px;
            line-height: 1.6;
          }

          .jv-site-check {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #E2E8F0;
            padding: 12px 14px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03);
          }

          .jv-site-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .jv-site-secondary {
            border: 1px solid rgba(255,255,255,0.10);
            background: rgba(255,255,255,0.05);
            color: #E2E8F0;
            border-radius: 14px;
            padding: 11px 15px;
            font-weight: 900;
            cursor: pointer;
            text-decoration: none;
          }

          .jv-site-danger {
            border: 1px solid rgba(248,113,113,0.30);
            background: rgba(127,29,29,0.20);
            color: #FECACA;
            border-radius: 14px;
            padding: 10px 13px;
            font-weight: 900;
            cursor: pointer;
          }

          .jv-site-slide {
            display: grid;
            grid-template-columns: 180px 1fr;
            gap: 14px;
            padding: 14px;
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.035);
          }

          .jv-site-thumb {
            min-height: 115px;
            border-radius: 16px;
            background-size: cover;
            background-position: center;
            border: 1px solid rgba(255,255,255,0.08);
          }

          .jv-site-preview {
            min-height: 280px;
            position: relative;
            overflow: hidden;
            border-radius: 22px;
            border: 1px solid rgba(56,189,248,0.20);
            background:
              linear-gradient(135deg, rgba(2,6,23,0.30), rgba(15,23,42,0.82)),
              radial-gradient(circle at 80% 10%, rgba(22,119,255,0.35), transparent 30%),
              linear-gradient(180deg, #020617, #07111f);
          }

          .jv-site-preview-slide {
            position: absolute;
            inset: 0;
            background-size: cover;
            background-position: center;
            opacity: 0;
            animation: jvAdminPreviewFade 18s infinite;
          }

          .jv-site-preview-slide:nth-child(1) { animation-delay: 0s; }
          .jv-site-preview-slide:nth-child(2) { animation-delay: 6s; }
          .jv-site-preview-slide:nth-child(3) { animation-delay: 12s; }

          .jv-site-preview-overlay {
            position: absolute;
            inset: 0;
            background:
              linear-gradient(90deg, rgba(2,6,23,0.92), rgba(2,6,23,0.46), rgba(2,6,23,0.82)),
              radial-gradient(circle at 80% 20%, rgba(22,119,255,0.24), transparent 32%);
          }

          .jv-site-preview-content {
            position: relative;
            z-index: 2;
            padding: 26px;
            max-width: 560px;
          }

          @keyframes jvAdminPreviewFade {
            0%, 28% { opacity: 1; }
            34%, 100% { opacity: 0; }
          }

          @media (max-width: 1100px) {
            .jv-site-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 700px) {
            .jv-site-slide {
              grid-template-columns: 1fr;
            }

            .jv-site-title {
              font-size: 25px;
            }
          }
        `}</style>

        <section className="jv-glass jv-site-header">
          <div
            style={{
              display: "inline-flex",
              width: "fit-content",
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(56,189,248,0.10)",
              border: "1px solid rgba(56,189,248,0.22)",
              color: "#BAE6FD",
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: "0.08em",
              marginBottom: 14,
            }}
          >
            SITE PÚBLICO · HERO SLIDES
          </div>

          <h1 className="jv-site-title">Banner principal do site</h1>

          <div className="jv-site-subtitle">
            Controle somente as imagens de fundo do hero da página principal. Adicione
            quantas imagens quiser por URL. O site identifica os slides ativos e cria o
            carrossel automaticamente.
          </div>

          <div className="jv-site-actions" style={{ marginTop: 16 }}>
            <a href="/" target="_blank" rel="noreferrer" className="jv-premium-btn" style={{ textDecoration: "none" }}>
              Ver site público
            </a>

            <button
              type="button"
              className="jv-site-secondary"
              onClick={() => void loadSlides()}
              disabled={loading || saving}
            >
              Recarregar
            </button>
          </div>
        </section>

        <section className="jv-site-grid">
          <div className="jv-glass jv-site-card" style={{ display: "grid", gap: 14 }}>
            <div>
              <h2 style={{ color: "#F8FAFC", margin: 0, fontSize: 22, fontWeight: 950 }}>
                {editingIndex === null ? "Adicionar imagem" : "Editar imagem"}
              </h2>

              <div className="jv-site-help" style={{ marginTop: 6 }}>
                Use uma URL pública de imagem, por exemplo uma imagem hospedada no seu site,
                CDN, GitHub raw ou outro servidor.
              </div>
            </div>

            <div className="jv-site-field">
              <label className="jv-site-label">Título interno</label>
              <input
                className="jv-premium-input"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Ex: Banner escritório moderno"
              />
            </div>

            <div className="jv-site-field">
              <label className="jv-site-label">URL da imagem</label>
              <input
                className="jv-premium-input"
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="jv-site-field">
              <label className="jv-site-label">Texto alternativo</label>
              <input
                className="jv-premium-input"
                value={form.alt}
                onChange={(event) => setForm((prev) => ({ ...prev, alt: event.target.value }))}
                placeholder="Descrição da imagem"
              />
            </div>

            <div className="jv-site-field">
              <label className="jv-site-label">Ordem</label>
              <input
                className="jv-premium-input"
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))
                }
              />
            </div>

            <label className="jv-site-check">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              Slide ativo
            </label>

            <div className="jv-site-actions">
              <button type="button" className="jv-premium-btn" onClick={addOrUpdateSlide}>
                {editingIndex === null ? "Adicionar à lista" : "Atualizar slide"}
              </button>

              <button type="button" className="jv-site-secondary" onClick={resetForm}>
                Limpar
              </button>
            </div>

            <div
              className="jv-site-preview"
              style={
                activeSlides[0]?.url
                  ? {
                      backgroundImage: `linear-gradient(90deg, rgba(2,6,23,.92), rgba(2,6,23,.58)), url(${activeSlides[0].url})`,
                    }
                  : undefined
              }
            >
              {activeSlides.slice(0, 3).map((slide, index) => (
                <div
                  key={`${slide.url}-${index}`}
                  className="jv-site-preview-slide"
                  style={{ backgroundImage: `url(${slide.url})` }}
                />
              ))}

              <div className="jv-site-preview-overlay" />

              <div className="jv-site-preview-content">
                <div style={{ color: "#38BDF8", fontSize: 12, fontWeight: 950, letterSpacing: "0.08em" }}>
                  PRÉVIA DO HERO
                </div>

                <div style={{ color: "#F8FAFC", fontSize: 34, fontWeight: 950, lineHeight: 1.05, marginTop: 12 }}>
                  Gestão jurídica premium
                </div>

                <div style={{ color: "#CBD5E1", lineHeight: 1.7, marginTop: 12 }}>
                  O fundo será trocado automaticamente conforme os slides ativos.
                </div>
              </div>
            </div>
          </div>

          <div className="jv-glass jv-site-card" style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ color: "#F8FAFC", margin: 0, fontSize: 22, fontWeight: 950 }}>
                  Slides cadastrados
                </h2>

                <div className="jv-site-help" style={{ marginTop: 6 }}>
                  Total: {slides.length} · Ativos: {activeSlides.length}
                </div>
              </div>

              <button type="button" className="jv-premium-btn" onClick={saveSlides} disabled={saving}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>

            {loading ? (
              <div className="jv-site-help">Carregando slides...</div>
            ) : slides.length === 0 ? (
              <div className="jv-site-help">
                Nenhuma imagem cadastrada. Adicione uma URL para começar o slide do hero.
              </div>
            ) : (
              slides
                .map((slide, index) => ({ slide, index }))
                .sort((a, b) => a.slide.sortOrder - b.slide.sortOrder)
                .map(({ slide, index }) => (
                  <article className="jv-site-slide" key={`${slide.url}-${index}`}>
                    <div
                      className="jv-site-thumb"
                      style={{ backgroundImage: `url(${slide.url})` }}
                    />

                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <strong style={{ color: "#F8FAFC", fontSize: 17 }}>
                          {slide.title || `Slide ${index + 1}`}
                        </strong>

                        <span style={{ color: slide.isActive ? "#A7F3D0" : "#FCA5A5", fontSize: 12, fontWeight: 950 }}>
                          {slide.isActive ? "ATIVO" : "INATIVO"}
                        </span>
                      </div>

                      <div style={{ color: "#94A3B8", fontSize: 13, wordBreak: "break-all" }}>
                        {slide.url}
                      </div>

                      <div style={{ color: "#CBD5E1", fontSize: 13 }}>
                        Ordem: {slide.sortOrder}
                      </div>

                      <label className="jv-site-check">
                        <input
                          type="checkbox"
                          checked={slide.isActive}
                          onChange={(event) =>
                            setSlides((prev) =>
                              prev.map((item, currentIndex) =>
                                currentIndex === index
                                  ? { ...item, isActive: event.target.checked }
                                  : item
                              )
                            )
                          }
                        />
                        Ativo no site
                      </label>

                      <div className="jv-site-actions">
                        <button type="button" className="jv-site-secondary" onClick={() => editSlide(index)}>
                          Editar
                        </button>

                        <button type="button" className="jv-site-secondary" onClick={() => moveSlide(index, "up")}>
                          Subir
                        </button>

                        <button type="button" className="jv-site-secondary" onClick={() => moveSlide(index, "down")}>
                          Descer
                        </button>

                        <button type="button" className="jv-site-danger" onClick={() => removeSlide(index)}>
                          Remover
                        </button>
                      </div>
                    </div>
                  </article>
                ))
            )}
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}