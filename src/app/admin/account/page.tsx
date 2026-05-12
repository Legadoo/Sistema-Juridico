"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

type MeResponse = {
  ok?: boolean;
  user?: {
    name?: string;
    role?: string;
    email?: string;
    onboardingStatus?: string;
    selectedPlanNameSnapshot?: string | null;
  };
  firm?: {
    name?: string;
  } | null;
};

export default function AdminAccountPage() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const response = await fetch("/api/me", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (!ignore) {
        if (!response.ok || !data?.ok) {
          window.location.href = "/login";
          return;
        }

        setMe(data);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  if (!me?.user) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#07070a", color: "#F8FAFC" }}>
        Carregando conta...
      </div>
    );
  }

  return (
    <AdminShell
      userName={me.user.name || "Usuário"}
      role={me.user.role || "MASTER"}
      firmName={me.firm?.name || "Advocacia"}
    >
      <div style={{ display: "grid", gap: 20 }}>
        <section className="jv-glass" style={{ borderRadius: 28, padding: 24, display: "grid", gap: 10 }}>
          <div style={{ color: "#C4B5FD", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em" }}>
            CONTA
          </div>

          <h1 style={{ margin: 0, color: "#F8FAFC", fontSize: 34, fontWeight: 950, letterSpacing: "-0.05em" }}>
            Minha conta
          </h1>

          <p style={{ margin: 0, color: "#94A3B8", lineHeight: 1.8 }}>
            Consulte as informações principais da sua assinatura e do seu escritório.
          </p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <div className="jv-premium-card" style={{ borderRadius: 22, padding: 18 }}>
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>E-MAIL</div>
            <div style={{ color: "#F8FAFC", fontSize: 18, fontWeight: 800, marginTop: 8 }}>
              {me.user.email || "Não informado"}
            </div>
          </div>

          <div className="jv-premium-card" style={{ borderRadius: 22, padding: 18 }}>
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>PLANO</div>
            <div style={{ color: "#F8FAFC", fontSize: 18, fontWeight: 800, marginTop: 8 }}>
              {me.user.selectedPlanNameSnapshot || "Não informado"}
            </div>
          </div>

          <div className="jv-premium-card" style={{ borderRadius: 22, padding: 18 }}>
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>STATUS</div>
            <div style={{ color: "#A7F3D0", fontSize: 18, fontWeight: 800, marginTop: 8 }}>
              {me.user.onboardingStatus || "ACTIVE"}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
