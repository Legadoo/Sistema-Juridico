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

type LandingMedia = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  url: string;
  alt?: string | null;
  section: string;
  sortOrder: number;
  isActive: boolean;
};

type AdminSiteResponse = {
  ok?: boolean;
  data?: {
    config?: Partial<LandingConfig>;
    media?: LandingMedia[];
  };
  message?: string;
};

type UploadResponse = {
  ok?: boolean;
  data?: {
    url: string;
    name: string;
    originalName: string;
    mimeType: string;
    size: number;
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

const emptyMediaForm = {
  title: "",
  description: "",
  type: "image",
  url: "",
  alt: "",
  section: "hero",
  sortOrder: 0,
  isActive: true,
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

const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
  lineHeight: 1.6,
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
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
            fontWeight: 800,
            letterSpacing: "-0.03em",
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
          fontWeight: 700,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function isLocalUpload(url: string) {
  return url.startsWith("/uploads/site-media/");
}

export default function SuperSitePage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState<LandingConfig>(emptyConfig);
  const [mediaList, setMediaList] = useState<LandingMedia[]>([]);

  const [mediaForm, setMediaForm] = useState(emptyMediaForm);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);

  const [savingConfig, setSavingConfig] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [removingPreviewFile, setRemovingPreviewFile] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const heroMedia = useMemo(() => {
    return mediaList.filter((item) => item.section === "hero");
  }, [mediaList]);

  const showcaseMedia = useMemo(() => {
    return mediaList.filter((item) => item.section === "showcase");
  }, [mediaList]);

  function showToast(message: string, type: ToastState["type"]) {
    setToast({ open: true, message, type });
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      const me = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!me) return;

      await loadSiteData(ignore);
    }

    void load();

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

  async function loadSiteData(ignore = false) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as AdminSiteResponse | null;

      if (!response.ok || !data?.ok) {
        if (!ignore) {
          showToast(data?.message || "Não foi possível carregar o site público.", "error");
        }
        return;
      }

      if (!ignore) {
        setConfig({
          ...emptyConfig,
          ...(data.data?.config ?? {}),
        });

        setMediaList(Array.isArray(data.data?.media) ? data.data!.media! : []);
      }
    } catch {
      if (!ignore) {
        showToast("Falha ao carregar dados do site público.", "error");
      }
    } finally {
      if (!ignore) {
        setLoading(false);
      }
    }
  }

  function resetMediaForm() {
    setMediaForm(emptyMediaForm);
    setEditingMediaId(null);
  }

  async function saveConfig() {
    if (!config.brandName.trim()) {
      showToast("Informe o nome da marca.", "warning");
      return;
    }

    if (!config.heroTitle.trim()) {
      showToast("Informe o título principal.", "warning");
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
        showToast(data?.message || "Erro ao salvar configuração.", "error");
        return;
      }

      showToast("Configuração geral salva com sucesso.", "success");
      await loadSiteData();
    } catch {
      showToast("Não foi possível salvar a configuração geral.", "error");
    } finally {
      setSavingConfig(false);
    }
  }

  async function uploadMediaFile(file: File) {
    setUploadingMedia(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/super/site/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as UploadResponse | null;

      if (!response.ok || !data?.ok || !data.data?.url) {
        showToast(data?.message || "Erro ao enviar a mídia.", "error");
        return;
      }

      const inferredType = data.data.mimeType.startsWith("video/") ? "video" : "image";

      setMediaForm((prev) => ({
        ...prev,
        url: data.data!.url,
        type: prev.type === "gif" ? "gif" : inferredType,
        alt: prev.alt || data.data!.originalName,
      }));

      showToast("Mídia enviada com sucesso.", "success");
    } catch {
      showToast("Não foi possível enviar a mídia.", "error");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function onPickMedia(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadMediaFile(file);
    event.target.value = "";
  }

  async function removeCurrentPreviewFile() {
    if (!mediaForm.url || !isLocalUpload(mediaForm.url)) {
      setMediaForm((prev) => ({ ...prev, url: "", alt: "" }));
      return;
    }

    setRemovingPreviewFile(true);

    try {
      const response = await fetch("/api/super/site/media/file", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileUrl: mediaForm.url }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível remover o arquivo.", "error");
        return;
      }

      setMediaForm((prev) => ({ ...prev, url: "", alt: "" }));
      showToast("Arquivo removido com sucesso.", "success");
    } catch {
      showToast("Falha ao remover o arquivo.", "error");
    } finally {
      setRemovingPreviewFile(false);
    }
  }

  async function saveMedia() {
    if (!mediaForm.title.trim()) {
      showToast("Informe o título da mídia.", "warning");
      return;
    }

    if (!mediaForm.url.trim()) {
      showToast("Envie uma mídia ou informe uma URL.", "warning");
      return;
    }

    setSavingMedia(true);

    try {
      const url = editingMediaId
        ? "/api/admin/site/media/" + editingMediaId
        : "/api/admin/site/media";

      const method = editingMediaId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mediaForm),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Erro ao salvar a mídia.", "error");
        return;
      }

      showToast(
        editingMediaId ? "Mídia atualizada com sucesso." : "Mídia criada com sucesso.",
        "success"
      );

      resetMediaForm();
      await loadSiteData();
    } catch {
      showToast("Não foi possível salvar a mídia.", "error");
    } finally {
      setSavingMedia(false);
    }
  }

  function editMedia(item: LandingMedia) {
    setEditingMediaId(item.id);
    setMediaForm({
      title: item.title,
      description: item.description ?? "",
      type: item.type,
      url: item.url,
      alt: item.alt ?? "",
      section: item.section === "showcase" ? "showcase" : "hero",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  }

  async function deleteMedia(item: LandingMedia) {
    const confirmed = window.confirm(
      "Deseja excluir esta mídia do site público? Se for arquivo local, o arquivo físico também será removido."
    );

    if (!confirmed) return;

    setDeletingMediaId(item.id);

    try {
      const response = await fetch("/api/admin/site/media/" + item.id, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível excluir a mídia.", "error");
        return;
      }

      if (item.url && isLocalUpload(item.url)) {
        await fetch("/api/super/site/media/file", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileUrl: item.url }),
        }).catch(() => null);
      }

      if (editingMediaId === item.id) {
        resetMediaForm();
      }

      showToast("Mídia excluída com sucesso.", "success");
      await loadSiteData();
    } catch {
      showToast("Falha ao excluir a mídia.", "error");
    } finally {
      setDeletingMediaId(null);
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
        Carregando gestão do site público...
      </div>
    );
  }

  const heroPadding = isMobile ? 20 : isTablet ? 24 : 28;
  const heroTitleSize = isMobile ? 26 : isTablet ? 30 : 36;
  const twoCols = isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))";
  const threeCols = isMobile ? "1fr" : isTablet ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))";

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
            borderRadius: isMobile ? 24 : 28,
            padding: heroPadding,
            background:
              "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(15,23,42,0.92) 45%, rgba(99,102,241,0.10))",
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
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              SITE PÚBLICO · SUPERADMIN
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
              Editor intuitivo da landing pública
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: isMobile ? 14 : 15,
                lineHeight: 1.7,
                maxWidth: 860,
              }}
            >
              Agora você pode organizar mídias do hero e da showcase separadamente,
              além de montar uma landing mais dinâmica com múltiplos arquivos no topo.
            </p>
          </div>
        </section>

        <SectionCard
          title="Configuração geral"
          description="Controle os textos centrais e links principais da landing pública."
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: twoCols, gap: 16 }}>
              <Field label="Nome da marca">
                <input
                  type="text"
                  value={config.brandName}
                  onChange={(e) => setConfig((prev) => ({ ...prev, brandName: e.target.value }))}
                  style={inputStyle}
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
                  }}
                >
                  <input
                    type="checkbox"
                    checked={config.isPublished}
                    onChange={(e) => setConfig((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  />
                  Landing publicada
                </label>
              </Field>
            </div>

            <Field label="Título principal">
              <textarea
                value={config.heroTitle}
                onChange={(e) => setConfig((prev) => ({ ...prev, heroTitle: e.target.value }))}
                style={textAreaStyle}
              />
            </Field>

            <Field label="Subtítulo principal">
              <textarea
                value={config.heroSubtitle}
                onChange={(e) => setConfig((prev) => ({ ...prev, heroSubtitle: e.target.value }))}
                style={textAreaStyle}
              />
            </Field>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <button
                type="button"
                className="jv-premium-btn"
                onClick={saveConfig}
                disabled={savingConfig || loading}
              >
                {savingConfig ? "Salvando..." : "Salvar configuração geral"}
              </button>

              <button
                type="button"
                className="jv-premium-btn-secondary"
                onClick={() => void loadSiteData()}
                disabled={savingConfig || loading}
              >
                Recarregar
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Mídias do site público"
          description="Cadastre mídias para o hero e para a showcase. Hero aparece no topo; showcase aparece na galeria."
        >
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: twoCols,
                gap: 18,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: twoCols, gap: 16 }}>
                  <Field label="Título da mídia">
                    <input
                      type="text"
                      value={mediaForm.title}
                      onChange={(e) => setMediaForm((prev) => ({ ...prev, title: e.target.value }))}
                      style={inputStyle}
                      placeholder="Dashboard principal"
                    />
                  </Field>

                  <Field label="Seção da mídia">
                    <select
                      value={mediaForm.section}
                      onChange={(e) => setMediaForm((prev) => ({ ...prev, section: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="hero">hero</option>
                      <option value="showcase">showcase</option>
                    </select>
                  </Field>

                  <Field label="Tipo de mídia">
                    <select
                      value={mediaForm.type}
                      onChange={(e) => setMediaForm((prev) => ({ ...prev, type: e.target.value }))}
                      style={inputStyle}
                    >
                      <option value="image">image</option>
                      <option value="gif">gif</option>
                      <option value="video">video</option>
                    </select>
                  </Field>

                  <Field label="Ordem">
                    <input
                      type="number"
                      value={mediaForm.sortOrder}
                      onChange={(e) =>
                        setMediaForm((prev) => ({ ...prev, sortOrder: Number(e.target.value || 0) }))
                      }
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <Field label="Descrição">
                  <textarea
                    value={mediaForm.description}
                    onChange={(e) => setMediaForm((prev) => ({ ...prev, description: e.target.value }))}
                    style={textAreaStyle}
                  />
                </Field>

                <Field label="Texto alternativo">
                  <input
                    type="text"
                    value={mediaForm.alt}
                    onChange={(e) => setMediaForm((prev) => ({ ...prev, alt: e.target.value }))}
                    style={inputStyle}
                    placeholder="Imagem do dashboard"
                  />
                </Field>

                <Field label="URL da mídia">
                  <input
                    type="text"
                    value={mediaForm.url}
                    onChange={(e) => setMediaForm((prev) => ({ ...prev, url: e.target.value }))}
                    style={inputStyle}
                    placeholder="/uploads/site-media/arquivo.png"
                  />
                </Field>

                <Field label="Ativa">
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
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={mediaForm.isActive}
                      onChange={(e) => setMediaForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    />
                    Mídia ativa
                  </label>
                </Field>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <label
                    className="jv-premium-btn-secondary"
                    style={{ cursor: uploadingMedia ? "not-allowed" : "pointer" }}
                  >
                    {uploadingMedia ? "Enviando..." : "Enviar mídia"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,video/mp4,video/webm,video/ogg"
                      onChange={onPickMedia}
                      style={{ display: "none" }}
                      disabled={uploadingMedia}
                    />
                  </label>

                  <button
                    type="button"
                    className="jv-premium-btn"
                    onClick={saveMedia}
                    disabled={savingMedia || uploadingMedia}
                  >
                    {savingMedia
                      ? "Salvando..."
                      : editingMediaId
                      ? "Salvar mídia"
                      : "Criar mídia"}
                  </button>

                  <button
                    type="button"
                    className="jv-premium-btn-secondary"
                    onClick={resetMediaForm}
                  >
                    Limpar formulário
                  </button>

                  {mediaForm.url ? (
                    <button
                      type="button"
                      className="jv-premium-btn-secondary"
                      onClick={() => void removeCurrentPreviewFile()}
                      disabled={removingPreviewFile}
                      style={{
                        borderColor: "rgba(248,113,113,0.24)",
                        color: "#FCA5A5",
                      }}
                    >
                      {removingPreviewFile ? "Removendo..." : "Remover mídia atual"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div
                className="jv-glass"
                style={{
                  borderRadius: 24,
                  padding: 18,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div style={{ color: "#F8FAFC", fontSize: 18, fontWeight: 800 }}>
                  Preview da mídia
                </div>

                {!mediaForm.url ? (
                  <div
                    style={{
                      minHeight: 220,
                      borderRadius: 18,
                      border: "1px dashed rgba(255,255,255,0.12)",
                      display: "grid",
                      placeItems: "center",
                      color: "#64748B",
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    Envie um arquivo ou informe uma URL para visualizar aqui.
                  </div>
                ) : mediaForm.type === "video" ? (
                  <video
                    src={mediaForm.url}
                    controls
                    style={{
                      width: "100%",
                      maxHeight: 320,
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "block",
                    }}
                  />
                ) : (
                  <img
                    src={mediaForm.url}
                    alt={mediaForm.alt || mediaForm.title || "Prévia"}
                    style={{
                      width: "100%",
                      maxHeight: 320,
                      objectFit: "cover",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "block",
                    }}
                  />
                )}

                <div style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.7 }}>
                  Use hero para o slide do topo. Use showcase para a galeria abaixo da landing.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 18,
              }}
            >
              <div className="jv-glass" style={{ borderRadius: 22, padding: 18, display: "grid", gap: 12 }}>
                <div style={{ color: "#F8FAFC", fontSize: 18, fontWeight: 800 }}>
                  Mídias do hero ({heroMedia.length})
                </div>

                {heroMedia.length === 0 ? (
                  <div style={{ color: "#94A3B8" }}>Nenhuma mídia de hero cadastrada ainda.</div>
                ) : (
                  heroMedia.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 18,
                        padding: 12,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={{ color: "#F8FAFC", fontWeight: 800 }}>{item.title}</div>
                      <div style={{ color: "#64748B", fontSize: 12 }}>
                        ordem {item.sortOrder} · {item.type}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="jv-premium-btn-secondary"
                          onClick={() => editMedia(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="jv-premium-btn-secondary"
                          onClick={() => void deleteMedia(item)}
                          disabled={deletingMediaId === item.id}
                          style={{
                            borderColor: "rgba(248,113,113,0.24)",
                            color: "#FCA5A5",
                          }}
                        >
                          {deletingMediaId === item.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="jv-glass" style={{ borderRadius: 22, padding: 18, display: "grid", gap: 12 }}>
                <div style={{ color: "#F8FAFC", fontSize: 18, fontWeight: 800 }}>
                  Mídias da showcase ({showcaseMedia.length})
                </div>

                {showcaseMedia.length === 0 ? (
                  <div style={{ color: "#94A3B8" }}>Nenhuma mídia de showcase cadastrada ainda.</div>
                ) : (
                  showcaseMedia.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 18,
                        padding: 12,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={{ color: "#F8FAFC", fontWeight: 800 }}>{item.title}</div>
                      <div style={{ color: "#64748B", fontSize: 12 }}>
                        ordem {item.sortOrder} · {item.type}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="jv-premium-btn-secondary"
                          onClick={() => editMedia(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="jv-premium-btn-secondary"
                          onClick={() => void deleteMedia(item)}
                          disabled={deletingMediaId === item.id}
                          style={{
                            borderColor: "rgba(248,113,113,0.24)",
                            color: "#FCA5A5",
                          }}
                        >
                          {deletingMediaId === item.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </SuperAdminShell>
  );
}