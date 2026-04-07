"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function updateViewport() {
      setIsMobile(window.innerWidth < 900);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  function fillDemo() {
    setEmail("demoadv@demo.com");
    setPassword("demo123");
    setMsg("Credenciais demo preenchidas. Ajuste se necessário.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg(data?.message || "Credenciais inválidas.");
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setMsg("Não foi possível entrar agora.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(56,189,248,0.08), transparent 20%), radial-gradient(circle at top right, rgba(124,58,237,0.10), transparent 28%), linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
        color: "#F8FAFC",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          opacity: 0.18,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(1220px, calc(100% - 32px))",
          margin: "0 auto",
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
          gap: isMobile ? 18 : 24,
          alignItems: "center",
          padding: isMobile ? "24px 0" : "32px 0",
        }}
      >
        <section
          style={{
            display: "grid",
            gap: isMobile ? 18 : 22,
            alignContent: "center",
            order: isMobile ? 2 : 1,
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
            JURIDICVAS · PAINEL ADMINISTRATIVO
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? 34 : 54,
                lineHeight: 1.04,
                fontWeight: 900,
                letterSpacing: "-0.06em",
                color: "#F8FAFC",
                maxWidth: 720,
              }}
            >
              Gestão jurídica com presença, organização e controle real.
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: isMobile ? 15 : 17,
                lineHeight: 1.9,
                maxWidth: 720,
              }}
            >
              Centralize clientes, processos, prazos e atualizações em um sistema
              profissional, moderno e feito para a rotina do advogado.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginTop: 8,
              maxWidth: 760,
            }}
          >
            {[
              "Área do cliente",
              "Controle de prazos",
              "Histórico processual",
              "Painel premium",
            ].map((item) => (
              <div
                key={item}
                style={{
                  padding: "14px 16px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
                  color: "#CBD5E1",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: isMobile ? 28 : 32,
            padding: isMobile ? 22 : 28,
            background:
              "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 50px rgba(0,0,0,0.32)",
            backdropFilter: "blur(16px)",
            order: isMobile ? 1 : 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -30,
              right: -20,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.24), transparent 70%)",
              filter: "blur(14px)",
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: -20,
              left: -20,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56,189,248,0.18), transparent 70%)",
              filter: "blur(12px)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontSize: isMobile ? 24 : 28,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: "#F8FAFC",
                }}
              >
                Entrar no sistema
              </div>

              <div
                style={{
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                  marginTop: 8,
                }}
              >
                Acesse seu painel administrativo com segurança.
              </div>
            </div>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
                  Senha
                </label>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {msg ? (
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
                  {msg}
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: isMobile ? "1fr" : "1fr",
                }}
              >
                <button
                  type="submit"
                  className="jv-premium-btn"
                  disabled={loading}
                  style={{ width: "100%", marginTop: 4 }}
                >
                  {loading ? "Entrando..." : "Entrar no JuridicVas"}
                </button>

                <button
                  type="button"
                  className="jv-premium-btn-secondary"
                  onClick={fillDemo}
                  disabled={loading}
                  style={{ width: "100%" }}
                >
                  Preencher modo demo
                </button>
              </div>
            </form>

            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94A3B8",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Ambiente restrito para equipe interna do escritório.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
