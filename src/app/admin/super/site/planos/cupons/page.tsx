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

type PublicCoupon = {
  id: string;
  code: string;
  description?: string | null;
  discountType: string;
  discountValue: number;
  isActive: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  maxUses?: number | null;
  usedCount: number;
};

type CouponsResponse = {
  ok?: boolean;
  data?: PublicCoupon[];
  message?: string;
};

const emptyCouponForm = {
  code: "",
  description: "",
  discountType: "PERCENT",
  discountValue: "",
  isActive: true,
  startsAt: "",
  expiresAt: "",
  maxUses: "",
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

function formatDateForInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function formatCouponDiscount(coupon: PublicCoupon) {
  if (coupon.discountType === "FIXED") {
    return `R$ ${Number(coupon.discountValue).toFixed(2).replace(".", ",")}`;
  }

  return `${coupon.discountValue}%`;
}

export default function SuperSiteCouponsPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [form, setForm] = useState(emptyCouponForm);
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
    setForm(emptyCouponForm);
    setEditingId(null);
  }

  async function loadCoupons(ignore = false) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/site/coupons", {
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as CouponsResponse | null;

      if (!response.ok || !data?.ok) {
        if (!ignore) {
          showToast(data?.message || "Não foi possível carregar os cupons.", "error");
        }
        return;
      }

      if (!ignore) {
        setCoupons(Array.isArray(data.data) ? data.data : []);
      }
    } catch {
      if (!ignore) {
        showToast("Falha ao carregar cupons.", "error");
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

      await loadCoupons(ignore);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  function editCoupon(item: PublicCoupon) {
    setEditingId(item.id);
    setForm({
      code: item.code,
      description: item.description || "",
      discountType: item.discountType === "FIXED" ? "FIXED" : "PERCENT",
      discountValue: String(item.discountValue),
      isActive: item.isActive,
      startsAt: formatDateForInput(item.startsAt),
      expiresAt: formatDateForInput(item.expiresAt),
      maxUses: item.maxUses ? String(item.maxUses) : "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCoupon() {
    if (!form.code.trim()) {
      showToast("Informe o código do cupom.", "warning");
      return;
    }

    if (!form.discountValue.trim()) {
      showToast("Informe o valor do desconto.", "warning");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? "/api/admin/site/coupons/" + editingId
        : "/api/admin/site/coupons";

      const method = editingId ? "PUT" : "POST";

      const payload = {
        ...form,
        code: form.code.toUpperCase().replace(/\s+/g, ""),
        discountValue: Number(form.discountValue.replace(",", ".")),
        startsAt: form.startsAt ? new Date(form.startsAt + "T00:00:00").toISOString() : "",
        expiresAt: form.expiresAt ? new Date(form.expiresAt + "T23:59:59").toISOString() : "",
      };

      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível salvar o cupom.", "error");
        return;
      }

      showToast(editingId ? "Cupom atualizado com sucesso." : "Cupom criado com sucesso.", "success");
      resetForm();
      await loadCoupons();
    } catch {
      showToast("Falha ao salvar cupom.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCoupon(item: PublicCoupon) {
    const confirmed = window.confirm("Deseja excluir este cupom?");
    if (!confirmed) return;

    setDeletingId(item.id);

    try {
      const response = await fetch("/api/admin/site/coupons/" + item.id, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showToast(data?.message || "Não foi possível excluir o cupom.", "error");
        return;
      }

      if (editingId === item.id) resetForm();

      showToast("Cupom excluído com sucesso.", "success");
      await loadCoupons();
    } catch {
      showToast("Falha ao excluir cupom.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (!me) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#05070d", color: "#E2E8F0" }}>
        Carregando cupons...
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
            background:
              "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(15,23,42,0.94) 45%, rgba(99,102,241,0.12))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ color: "#CFFAFE", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em" }}>
              SITE PÚBLICO · PLANOS · CUPONS
            </div>

            <h1 style={{ margin: 0, color: "#F8FAFC", fontSize: 36, fontWeight: 950, letterSpacing: "-0.05em" }}>
              Cupons de desconto
            </h1>

            <p style={{ margin: 0, color: "#94A3B8", lineHeight: 1.8, maxWidth: 900 }}>
              Crie cupons para campanhas, promoções e descontos especiais. O desconto será aplicado antes do checkout do Mercado Pago.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a href="/admin/super/site/planos" className="jv-premium-btn-secondary" style={{ textDecoration: "none" }}>
                Voltar aos planos
              </a>
              <a href="/" target="_blank" rel="noreferrer" className="jv-premium-btn" style={{ textDecoration: "none" }}>
                Ver site
              </a>
            </div>
          </div>
        </section>

        <section className="jv-glass" style={{ borderRadius: 28, padding: 22, display: "grid", gap: 18 }}>
          <h2 style={{ margin: 0, color: "#F8FAFC", fontSize: 24, fontWeight: 900 }}>
            {editingId ? "Editar cupom" : "Novo cupom"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <Field label="Código do cupom">
              <input
                style={inputStyle}
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    code: event.target.value.toUpperCase().replace(/\s+/g, ""),
                  }))
                }
                placeholder="DESCONTO20"
              />
            </Field>

            <Field label="Tipo de desconto">
              <select
                style={inputStyle}
                value={form.discountType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountType: event.target.value }))
                }
              >
                <option value="PERCENT">Porcentagem (%)</option>
                <option value="FIXED">Valor fixo (R$)</option>
              </select>
            </Field>

            <Field label={form.discountType === "FIXED" ? "Valor em reais" : "Porcentagem"}>
              <input
                style={inputStyle}
                value={form.discountValue}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountValue: event.target.value }))
                }
                placeholder={form.discountType === "FIXED" ? "50" : "20"}
              />
            </Field>

            <Field label="Limite de usos">
              <input
                style={inputStyle}
                value={form.maxUses}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxUses: event.target.value }))
                }
                placeholder="Deixe vazio para ilimitado"
              />
            </Field>

            <Field label="Início">
              <input
                type="date"
                style={inputStyle}
                value={form.startsAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startsAt: event.target.value }))
                }
              />
            </Field>

            <Field label="Validade">
              <input
                type="date"
                style={inputStyle}
                value={form.expiresAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
              />
            </Field>
          </div>

          <Field label="Descrição interna">
            <textarea
              style={textAreaStyle}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Ex: Campanha de lançamento para novos escritórios."
            />
          </Field>

          <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#E2E8F0" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Cupom ativo
          </label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" className="jv-premium-btn" onClick={saveCoupon} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar cupom"}
            </button>

            {editingId ? (
              <button type="button" className="jv-premium-btn-secondary" onClick={resetForm} disabled={saving}>
                Cancelar edição
              </button>
            ) : null}
          </div>
        </section>

        <section className="jv-glass" style={{ borderRadius: 28, padding: 22, display: "grid", gap: 18 }}>
          <h2 style={{ margin: 0, color: "#F8FAFC", fontSize: 24, fontWeight: 900 }}>
            Cupons cadastrados
          </h2>

          {loading ? (
            <div className="jv-premium-card" style={{ borderRadius: 22, padding: 22, color: "#CBD5E1" }}>
              Carregando...
            </div>
          ) : coupons.length === 0 ? (
            <div className="jv-premium-card" style={{ borderRadius: 22, padding: 22, color: "#CBD5E1" }}>
              Nenhum cupom cadastrado.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {coupons.map((item) => (
                <article key={item.id} className="jv-premium-card" style={{ borderRadius: 24, padding: 18, display: "grid", gap: 12 }}>
                  <div>
                    <strong style={{ color: "#F8FAFC", fontSize: 20 }}>{item.code}</strong>
                    <p style={{ margin: "8px 0 0", color: "#94A3B8", fontSize: 13, lineHeight: 1.7 }}>
                      {item.description || "Sem descrição."}
                    </p>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ borderRadius: 999, padding: "6px 9px", fontSize: 11, fontWeight: 900, color: "#A5F3FC", background: "rgba(34,211,238,0.10)", border: "1px solid rgba(34,211,238,0.18)" }}>
                      {formatCouponDiscount(item)}
                    </span>

                    <span style={{ borderRadius: 999, padding: "6px 9px", fontSize: 11, fontWeight: 900, color: item.isActive ? "#A7F3D0" : "#FCA5A5", background: item.isActive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", border: item.isActive ? "1px solid rgba(16,185,129,0.22)" : "1px solid rgba(239,68,68,0.22)" }}>
                      {item.isActive ? "ATIVO" : "INATIVO"}
                    </span>

                    <span style={{ borderRadius: 999, padding: "6px 9px", fontSize: 11, fontWeight: 900, color: "#CBD5E1", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      Usos: {item.usedCount}{item.maxUses ? `/${item.maxUses}` : ""}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button type="button" className="jv-premium-btn-secondary" onClick={() => editCoupon(item)}>
                      Editar
                    </button>

                    <button type="button" className="jv-premium-btn-secondary" onClick={() => void deleteCoupon(item)} disabled={deletingId === item.id}>
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
