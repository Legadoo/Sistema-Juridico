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

type MediaResponse = {
  ok?: boolean;
  data?: LandingMedia[];
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
  minHeight: 100,
  resize: "vertical",
  lineHeight: 1.6,
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 800 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SuperSiteMediaPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<LandingMedia[]>([]);
  const [form, setForm] = useState(emptyMediaForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    setForm(emptyMediaForm);
    setEditingId(null);
  }

  async function loadMedia(ignore = false) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site/media", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as MediaResponse | null;

      if (!response.ok || !data?.ok) {
        if (!ignore) showToast(data?.message || "Não foi possível carregar as mídias.", "error");
        return;
      }

      if (!ignore) setMedia(Array.isArray(data.data) ? data.data : []);
    } catch {
      if (!ignore) showToast("Falha ao carregar mídias.", "error");
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

      await loadMedia(ignore);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  async function uploadMediaFile(file: File) {
    setUploading(true);

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

      setForm((prev) => ({
        ...prev,
        url: data.data!.url,
        type: inferredType,
        alt: prev.alt || data.data!.originalName,
      }));

      showToast("Mídia enviada com sucesso.", "success");
    } catch {
      showToast("Não foi possível enviar a mídia.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function onPickMedia(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadMediaFile(file);
    event.target.value = "";
  }

  function editMedia(item: LandingMedia) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      type: item.type,
      url: item.url,
      alt: item.alt || "",
      section: item.section,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveMedia() {
    if (!form.title.trim()) {
      showToast("Informe o título da mídia.", "warning");
      return;
    }

    if (!form.url.trim()) {
      showToast("Envie uma mídia ou informe uma URL.", "warning");
      return;
    }

    setSaving(true);

    try {
      const url = editingId ? "/api/admin/site/media/" + editingId : "/api/admin/site/media";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível salvar a mídia.", "error");
        return;
      }

      showToast(editingId ? "Mídia atualizada com sucesso." : "Mídia criada com sucesso.", "success");
      resetForm();
      await loadMedia();
    } catch {
      showToast("Falha ao salvar mídia.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMedia(item: LandingMedia) {
    const confirmed = window.confirm("Deseja excluir esta mídia do site público?");
    if (!confirmed) return;

    setDeletingId(item.id);

    try {
      const response = await fetch("/api/admin/site/media/" + item.id, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível excluir a mídia.", "error");
        return;
      }

      if (editingId === item.id) resetForm();

      showToast("Mídia excluída com sucesso.", "success");
      await loadMedia();
    } catch {
      showToast("Falha ao excluir mídia.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (!me) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05070d", color: "#E2E8F0" }}>
        Carregando mídias do site público...
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
              SITE PÚBLICO · MÍDIAS
            </div>

            <h1 style={{ margin: 0, color: "#F8FAFC", fontSize: 36, fontWeight: 950, letterSpacing: "-0.05em" }}>
              Mídias do site público
            </h1>

            <p style={{ margin: 0, color: "#94A3B8", lineHeight: 1.8, maxWidth: 900 }}>
              Gerencie imagens e vídeos exibidos no topo da landing e na vitrine de demonstrações.
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

        <section className="jv-glass" style={{ borderRadius: 28, padding: 22, display: "grid", gap: 18 }}>
          <h2 style={{ margin: 0, color: "#F8FAFC", fontSize: 24, fontWeight: 900 }}>
            {editingId ? "Editar mídia" : "Nova mídia"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <Field label="Título">
              <input style={inputStyle} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </Field>

            <Field label="Seção">
              <select style={inputStyle} value={form.section} onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}>
                <option value="hero">hero</option>
                <option value="showcase">showcase</option>
              </select>
            </Field>

            <Field label="Tipo">
              <select style={inputStyle} value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="gif">gif</option>
              </select>
            </Field>

            <Field label="Ordem">
              <input type="number" style={inputStyle} value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))} />
            </Field>
          </div>

          <Field label="Descrição">
            <textarea style={textAreaStyle} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            <Field label="URL da mídia">
              <input style={inputStyle} value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
            </Field>

            <Field label="Texto alternativo">
              <input style={inputStyle} value={form.alt} onChange={(e) => setForm((p) => ({ ...p, alt: e.target.value }))} />
            </Field>
          </div>

          <Field label="Upload de arquivo">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={onPickMedia}
              disabled={uploading}
              style={inputStyle}
            />
          </Field>

          {form.url ? (
            <div className="jv-premium-card" style={{ borderRadius: 22, padding: 14 }}>
              {form.type === "video" ? (
                <video src={form.url} controls style={{ width: "100%", maxHeight: 360, borderRadius: 16, objectFit: "cover" }} />
              ) : (
                <img src={form.url} alt={form.alt || form.title} style={{ width: "100%", maxHeight: 360, borderRadius: 16, objectFit: "cover" }} />
              )}
            </div>
          ) : null}

          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#E2E8F0" }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
            Mostrar no site público
          </label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button className="jv-premium-btn" onClick={saveMedia} disabled={saving || uploading}>
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar mídia"}
            </button>

            {editingId ? (
              <button className="jv-premium-btn-secondary" onClick={resetForm} disabled={saving}>
                Cancelar edição
              </button>
            ) : null}
          </div>
        </section>

        <section className="jv-glass" style={{ borderRadius: 28, padding: 22, display: "grid", gap: 18 }}>
          <h2 style={{ margin: 0, color: "#F8FAFC", fontSize: 24, fontWeight: 900 }}>Mídias cadastradas</h2>

          {loading ? (
            <div className="jv-premium-card" style={{ borderRadius: 22, padding: 22, color: "#CBD5E1" }}>Carregando...</div>
          ) : media.length === 0 ? (
            <div className="jv-premium-card" style={{ borderRadius: 22, padding: 22, color: "#CBD5E1" }}>Nenhuma mídia cadastrada.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {media.map((item) => (
                <article key={item.id} className="jv-premium-card" style={{ borderRadius: 24, padding: 16, display: "grid", gap: 12 }}>
                  {item.type === "video" ? (
                    <video src={item.url} controls style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: 16 }} />
                  ) : (
                    <img src={item.url} alt={item.alt || item.title} style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: 16 }} />
                  )}

                  <div>
                    <strong style={{ color: "#F8FAFC" }}>{item.title}</strong>
                    <p style={{ margin: "8px 0 0", color: "#94A3B8", fontSize: 13, lineHeight: 1.6 }}>{item.description || "Sem descrição."}</p>
                  </div>

                  <div style={{ color: "#94A3B8", fontSize: 12 }}>
                    {item.section} · ordem {item.sortOrder} · {item.isActive ? "publicada" : "oculta"}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button className="jv-premium-btn-secondary" onClick={() => editMedia(item)}>Editar</button>
                    <button className="jv-premium-btn-secondary" onClick={() => void deleteMedia(item)} disabled={deletingId === item.id}>
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
