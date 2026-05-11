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

type PublicPlan = {
  id: string;
  name: string;
  priceLabel: string;
  billingPeriod: string;
  description?: string | null;
  featuresText: string;
  badgeText?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  ctaText: string;
  isPurchasable: boolean;
  moduleDashboard: boolean;
  moduleClients: boolean;
  moduleProcesses: boolean;
  moduleDeadlines: boolean;
  moduleAppointments: boolean;
  moduleAvailability: boolean;
  moduleUsers: boolean;
  moduleCharges: boolean;
  isHighlighted: boolean;
  sortOrder: number;
  isActive: boolean;
};

type PlansResponse = {
  ok?: boolean;
  data?: PublicPlan[];
  message?: string;
};

const emptyPlanForm = {
  name: "",
  priceLabel: "",
  billingPeriod: "/mês",
  description: "",
  featuresText: "",
  badgeText: "",
  imageUrl: "",
  imageAlt: "",
  ctaText: "Assinar agora",
  isPurchasable: true,
  moduleDashboard: true,
  moduleClients: true,
  moduleProcesses: true,
  moduleDeadlines: true,
  moduleAppointments: true,
  moduleAvailability: true,
  moduleUsers: true,
  moduleCharges: true,
  isHighlighted: false,
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
  minHeight: 110,
  resize: "vertical",
  lineHeight: 1.6,
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 800 }}>{label}</label>
      {children}
    </div>
  );
}

export default function SuperSitePlansPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [form, setForm] = useState(emptyPlanForm);
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
    setForm(emptyPlanForm);
    setEditingId(null);
  }

  async function loadPlans(ignore = false) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site/plans", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as PlansResponse | null;

      if (!response.ok || !data?.ok) {
        if (!ignore) showToast(data?.message || "Não foi possível carregar os planos.", "error");
        return;
      }

      if (!ignore) setPlans(Array.isArray(data.data) ? data.data : []);
    } catch {
      if (!ignore) showToast("Falha ao carregar planos.", "error");
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

      await loadPlans(ignore);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  function editPlan(item: PublicPlan) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      priceLabel: item.priceLabel,
      billingPeriod: item.billingPeriod,
      description: item.description || "",
      featuresText: item.featuresText,
      badgeText: item.badgeText || "",
      imageUrl: item.imageUrl || "",
      imageAlt: item.imageAlt || "",
      ctaText: item.ctaText,
      isPurchasable: item.isPurchasable,
      moduleDashboard: item.moduleDashboard,
      moduleClients: item.moduleClients,
      moduleProcesses: item.moduleProcesses,
      moduleDeadlines: item.moduleDeadlines,
      moduleAppointments: item.moduleAppointments,
      moduleAvailability: item.moduleAvailability,
      moduleUsers: item.moduleUsers,
      moduleCharges: item.moduleCharges,
      isHighlighted: item.isHighlighted,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePlan() {
    if (!form.name.trim()) {
      showToast("Informe o nome do plano.", "warning");
      return;
    }

    if (!form.priceLabel.trim()) {
      showToast("Informe o preço do plano.", "warning");
      return;
    }

    if (!form.featuresText.trim()) {
      showToast("Informe os benefícios do plano.", "warning");
      return;
    }

    setSaving(true);

    try {
      const url = editingId ? "/api/admin/site/plans/" + editingId : "/api/admin/site/plans";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível salvar o plano.", "error");
        return;
      }

      showToast(editingId ? "Plano atualizado com sucesso." : "Plano criado com sucesso.", "success");
      resetForm();
      await loadPlans();
    } catch {
      showToast("Falha ao salvar plano.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(item: PublicPlan) {
    const confirmed = window.confirm("Deseja excluir este plano público?");
    if (!confirmed) return;

    setDeletingId(item.id);

    try {
      const response = await fetch("/api/admin/site/plans/" + item.id, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível excluir o plano.", "error");
        return;
      }

      if (editingId === item.id) resetForm();

      showToast("Plano excluído com sucesso.", "success");
      await loadPlans();
    } catch {
      showToast("Falha ao excluir plano.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (!me) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05070d", color: "#E2E8F0" }}>
        Carregando planos públicos...
      </div>
    );
  }

  const moduleFields = [
    ["moduleDashboard", "Dashboard"],
    ["moduleClients", "Clientes"],
    ["moduleProcesses", "Processos"],
    ["moduleDeadlines", "Prazos"],
    ["moduleAppointments", "Agendamentos"],
    ["moduleAvailability", "Disponibilidade"],
    ["moduleUsers", "Usuários"],
    ["moduleCharges", "Cobranças"],
  ] as const;

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
              SITE PÚBLICO · PLANOS
            </div>

            <h1 style={{ margin: 0, color: "#F8FAFC", fontSize: 36, fontWeight: 950, letterSpacing: "-0.05em" }}>
              Planos públicos
            </h1>

            <p style={{ margin: 0, color: "#94A3B8", lineHeight: 1.8, maxWidth: 900 }}>
              Cadastre planos comerciais, preços, módulos disponíveis e destaque principal da landing.
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
            {editingId ? "Editar plano" : "Novo plano"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <Field label="Nome">
              <input style={inputStyle} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Field>

            <Field label="Preço">
              <input style={inputStyle} value={form.priceLabel} onChange={(e) => setForm((p) => ({ ...p, priceLabel: e.target.value }))} placeholder="R$ 97,00" />
            </Field>

            <Field label="Período">
              <input style={inputStyle} value={form.billingPeriod} onChange={(e) => setForm((p) => ({ ...p, billingPeriod: e.target.value }))} />
            </Field>

            <Field label="Ordem">
              <input type="number" style={inputStyle} value={form.sortOrder} onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))} />
            </Field>
          </div>

          <Field label="Descrição">
            <textarea style={textAreaStyle} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </Field>

          <Field label="Benefícios do plano">
            <textarea style={textAreaStyle} value={form.featuresText} onChange={(e) => setForm((p) => ({ ...p, featuresText: e.target.value }))} placeholder={"1 benefício por linha"} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <Field label="Selo/Destaque">
              <input style={inputStyle} value={form.badgeText} onChange={(e) => setForm((p) => ({ ...p, badgeText: e.target.value }))} placeholder="Mais vendido" />
            </Field>

            <Field label="Texto do botão">
              <input style={inputStyle} value={form.ctaText} onChange={(e) => setForm((p) => ({ ...p, ctaText: e.target.value }))} />
            </Field>

            <Field label="Imagem URL">
              <input style={inputStyle} value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} />
            </Field>

            <Field label="Texto alternativo da imagem">
              <input style={inputStyle} value={form.imageAlt} onChange={(e) => setForm((p) => ({ ...p, imageAlt: e.target.value }))} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {moduleFields.map(([key, label]) => (
              <label key={key} className="jv-premium-card" style={{ borderRadius: 18, padding: 14, display: "flex", gap: 10, color: "#E2E8F0" }}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "#E2E8F0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Mostrar no site
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={form.isHighlighted} onChange={(e) => setForm((p) => ({ ...p, isHighlighted: e.target.checked }))} />
              Plano em destaque
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={form.isPurchasable} onChange={(e) => setForm((p) => ({ ...p, isPurchasable: e.target.checked }))} />
              Permitir assinatura
            </label>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button className="jv-premium-btn" onClick={savePlan} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar plano"}
            </button>

            {editingId ? (
              <button className="jv-premium-btn-secondary" onClick={resetForm} disabled={saving}>
                Cancelar edição
              </button>
            ) : null}
          </div>
        </section>

        <section className="jv-glass" style={{ borderRadius: 28, padding: 22, display: "grid", gap: 18 }}>
          <h2 style={{ margin: 0, color: "#F8FAFC", fontSize: 24, fontWeight: 900 }}>Planos cadastrados</h2>

          {loading ? (
            <div className="jv-premium-card" style={{ borderRadius: 22, padding: 22, color: "#CBD5E1" }}>Carregando...</div>
          ) : plans.length === 0 ? (
            <div className="jv-premium-card" style={{ borderRadius: 22, padding: 22, color: "#CBD5E1" }}>Nenhum plano cadastrado.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {plans.map((item) => (
                <article key={item.id} className="jv-premium-card" style={{ borderRadius: 24, padding: 18, display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ color: "#F8FAFC", fontSize: 20 }}>{item.name}</strong>
                    <div style={{ marginTop: 8, color: "#A5F3FC", fontSize: 24, fontWeight: 950 }}>
                      {item.priceLabel} <span style={{ color: "#94A3B8", fontSize: 13 }}>{item.billingPeriod}</span>
                    </div>
                    <p style={{ margin: "10px 0 0", color: "#94A3B8", fontSize: 13, lineHeight: 1.7 }}>{item.description || "Sem descrição."}</p>
                  </div>

                  <div style={{ color: "#94A3B8", fontSize: 12 }}>
                    ordem {item.sortOrder} · {item.isActive ? "publicado" : "oculto"} · {item.isHighlighted ? "destaque" : "normal"}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button className="jv-premium-btn-secondary" onClick={() => editPlan(item)}>Editar</button>
                    <button className="jv-premium-btn-secondary" onClick={() => void deletePlan(item)} disabled={deletingId === item.id}>
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
