"use client";

import { useEffect, useState } from "react";

type SubscriptionStatusResponse = {
  ok?: boolean;
  data?: {
    user?: {
      id?: string;
      email?: string | null;
      role?: string;
      firmId?: string | null;
      onboardingStatus?: string;
    };
    nextStep?: string;
  };
  message?: string;
};

export default function FirmOnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [firmName, setFirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch("/api/public/subscription/status", {
          cache: "no-store",
        });

        const data = (await response.json().catch(() => null)) as SubscriptionStatusResponse | null;

        if (!response.ok || !data?.ok || !data.data?.user) {
          window.location.href = "/login";
          return;
        }

        const status = data.data.user.onboardingStatus;
        const firmId = data.data.user.firmId;

        if (firmId) {
          window.location.href = "/admin";
          return;
        }

        if (!ignore) {
          setAllowed(status === "FIRM_REQUIRED");
        }
      } catch {
        window.location.href = "/login";
        return;
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!firmName.trim()) {
      setError("Informe o nome da advocacia.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/public/onboarding/firm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          firmName,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(data?.message || "Não foi possível criar a advocacia.");
        return;
      }

      setMessage("Advocacia criada com sucesso. Redirecionando para o painel...");
      setTimeout(() => {
        window.location.href = "/admin";
      }, 900);
    } catch {
      setError("Falha ao criar a advocacia.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.08), transparent 20%), radial-gradient(circle at top right, rgba(124,58,237,0.10), transparent 28%), linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
          color: "#E2E8F0",
          padding: 24,
          textAlign: "center",
        }}
      >
        Carregando onboarding da advocacia...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.08), transparent 20%), radial-gradient(circle at top right, rgba(124,58,237,0.10), transparent 28%), linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
          color: "#E2E8F0",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "min(560px, 100%)",
            borderRadius: 28,
            padding: 24,
            background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 900, color: "#F8FAFC" }}>
            Acesso ainda não liberado
          </div>
          <div style={{ marginTop: 12, color: "#94A3B8", lineHeight: 1.7 }}>
            Você ainda não está na etapa de criação da advocacia.
          </div>
          <button
            type="button"
            className="jv-premium-btn"
            onClick={() => {
              window.location.href = "/";
            }}
            style={{ marginTop: 18 }}
          >
            Voltar ao site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.08), transparent 20%), radial-gradient(circle at top right, rgba(124,58,237,0.10), transparent 28%), linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
        color: "#F8FAFC",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(620px, 100%)",
          borderRadius: 30,
          padding: 28,
          background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
          display: "grid",
          gap: 18,
        }}
      >
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
            color: "#BFDBFE",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          ONBOARDING DA ADVOCACIA
        </div>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              lineHeight: 1.05,
            }}
          >
            Cadastre sua advocacia
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#94A3B8",
              fontSize: 15,
              lineHeight: 1.8,
            }}
          >
            Agora que seu plano foi pago, finalize o cadastro do seu escritório
            para ativar o painel administrativo.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label
              style={{
                color: "#CBD5E1",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Nome da advocacia
            </label>

            <input
              type="text"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Ex.: Martins Advocacia"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#F8FAFC",
                borderRadius: 16,
                padding: "14px 16px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error ? (
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.18)",
                color: "#FECACA",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          ) : null}

          {message ? (
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                background: "rgba(16,185,129,0.10)",
                border: "1px solid rgba(16,185,129,0.18)",
                color: "#A7F3D0",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            className="jv-premium-btn"
            disabled={submitting}
            style={{ width: "100%" }}
          >
            {submitting ? "Criando advocacia..." : "Criar advocacia e entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}