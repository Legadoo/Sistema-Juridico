"use client";

import { useState } from "react";

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

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setOk(false);
    setLoading(true);

    try {
      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg(data?.message || "Não foi possível concluir o cadastro.");
        setLoading(false);
        return;
      }

      setOk(true);
      setMsg("Cadastro realizado com sucesso. Redirecionando...");
      window.setTimeout(() => {
        window.location.href = data?.data?.redirectTo || "/";
      }, 700);
    } catch {
      setMsg("Falha ao cadastrar usuário.");
      setLoading(false);
      return;
    }

    setLoading(false);
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
          CADASTRO DO ADVOGADO
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
            Crie sua conta no JuridicVas
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#94A3B8",
              fontSize: 15,
              lineHeight: 1.8,
            }}
          >
            Faça seu cadastro para escolher um plano, ativar o sistema e criar sua advocacia.
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 700 }}>
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 700 }}>
              Telefone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(21) 99999-9999"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 700 }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 700 }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crie uma senha"
              style={inputStyle}
            />
          </div>

          {msg ? (
            <div
              style={{
                padding: 14,
                borderRadius: 16,
                background: ok
                  ? "rgba(16,185,129,0.10)"
                  : "rgba(239,68,68,0.10)",
                border: ok
                  ? "1px solid rgba(16,185,129,0.18)"
                  : "1px solid rgba(239,68,68,0.18)",
                color: ok ? "#A7F3D0" : "#FECACA",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {msg}
            </div>
          ) : null}

          <button
            type="submit"
            className="jv-premium-btn"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>

          <button
            type="button"
            className="jv-premium-btn-secondary"
            onClick={() => {
              window.location.href = "/login";
            }}
            style={{ width: "100%" }}
          >
            Já tenho conta
          </button>
        </form>
      </div>
    </div>
  );
}