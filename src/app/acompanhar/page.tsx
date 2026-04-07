"use client";

import { useMemo, useState, useEffect } from "react";

type TrackResp = {
  ok: boolean;
  message?: string;
  client?: {
    name: string;
    document: string;
  };
  processes?: Array<{
    id: string;
    cnj: string;
    tribunal?: string | null;
    vara?: string | null;
    status: string;
    updates: Array<{
      date: string;
      text: string;
    }>;
  }>;
};

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function formatDocument(value: string) {
  const digits = onlyDigits(value);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

function getStatusTone(status: string) {
  const s = status.toLowerCase();

  if (s.includes("andamento") || s.includes("ativo") || s.includes("tramita")) {
    return {
      background: "rgba(56,189,248,0.10)",
      border: "1px solid rgba(56,189,248,0.18)",
      color: "#BAE6FD",
    };
  }

  if (s.includes("conclu") || s.includes("baixad") || s.includes("encerr")) {
    return {
      background: "rgba(16,185,129,0.10)",
      border: "1px solid rgba(16,185,129,0.18)",
      color: "#A7F3D0",
    };
  }

  if (s.includes("aten") || s.includes("pend")) {
    return {
      background: "rgba(245,158,11,0.10)",
      border: "1px solid rgba(245,158,11,0.18)",
      color: "#FDE68A",
    };
  }

  return {
    background: "rgba(99,102,241,0.10)",
    border: "1px solid rgba(99,102,241,0.18)",
    color: "#C7D2FE",
  };
}

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

export default function AcompanharPage() {
  const [document, setDocument] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [data, setData] = useState<TrackResp | null>(null);

const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  function update() {
    setIsMobile(window.innerWidth < 768);
  }
  update();
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}, []);

  const processCount = useMemo(() => data?.processes?.length ?? 0, [data]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMsg(null);
    setData(null);
    setLoading(true);

    const res = await fetch("/api/public/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document, code }),
    })
      .then(async (r) => ({
        ok: r.ok,
        d: await r.json().catch(() => null),
      }))
      .catch(() => null);

    setLoading(false);

    if (!res || !res.ok || !res.d?.ok) {
      setMsg(res?.d?.message || "Não foi possível consultar.");
      return;
    }

    setData(res.d);
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
          width: "min(1180px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "36px 0 56px",
          display: "grid",
          gap: 24,
        }}
      >
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 30,
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(15,23,42,0.88) 45%, rgba(56,189,248,0.10))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -10,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,58,237,0.28), transparent 70%)",
              filter: "blur(16px)",
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: -30,
              left: -20,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56,189,248,0.18), transparent 70%)",
              filter: "blur(14px)",
            }}
          />

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
                color: "#BFDBFE",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              ÁREA DO CLIENTE
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 36,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                color: "#F8FAFC",
              }}
            >
              Acompanhar processo
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 15,
                lineHeight: 1.7,
                maxWidth: 780,
              }}
            >
              Consulte suas informações com segurança usando o CPF/CNPJ e o código
              fornecido pelo escritório.
            </p>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(340px, 420px) 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div
            style={{
              borderRadius: 28,
              padding: 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
                Consultar acesso
              </div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 6, lineHeight: 1.6 }}>
                Digite seus dados exatamente como informados pelo escritório.
              </div>
            </div>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
                  CPF ou CNPJ
                </label>
                <input
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="Digite seu CPF ou CNPJ"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ color: "#CBD5E1", fontSize: 13, fontWeight: 600 }}>
                  Código de acesso
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Código informado pelo escritório"
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

              <button
                type="submit"
                className="jv-premium-btn"
                disabled={loading}
                style={{ width: "100%", marginTop: 4 }}
              >
                {loading ? "Consultando..." : "Consultar agora"}
              </button>
            </form>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 18,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                color: "#94A3B8",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Esta área mostra apenas informações liberadas pelo escritório.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            {!data?.ok ? (
              <div
                style={{
                  borderRadius: 28,
                  padding: 24,
                  background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
                  border: "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
                  backdropFilter: "blur(14px)",
                  minHeight: 280,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div style={{ textAlign: "center", maxWidth: 520 }}>
                  <div
                    style={{
                      width: 74,
                      height: 74,
                      borderRadius: "50%",
                      margin: "0 auto 18px",
                      display: "grid",
                      placeItems: "center",
                      background: "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(56,189,248,0.12))",
                      border: "1px solid rgba(255,255,255,0.06)",
                      boxShadow: "0 14px 30px rgba(0,0,0,0.22)",
                      fontSize: 28,
                    }}
                  >
                    ⚖
                  </div>

                  <div style={{ fontSize: 24, fontWeight: 800, color: "#F8FAFC" }}>
                    Consulta protegida
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      color: "#64748B",
                      lineHeight: 1.7,
                      marginTop: 10,
                    }}
                  >
                    Após informar seus dados, você verá aqui os processos liberados,
                    o status atual e as últimas atualizações visíveis.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    borderRadius: 28,
                    padding: 22,
                    background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr",
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ color: "#94A3B8", fontSize: 13 }}>Cliente</div>
                      <div
                        style={{
                          color: "#F8FAFC",
                          fontSize: 24,
                          fontWeight: 800,
                          marginTop: 8,
                        }}
                      >
                        {data.client?.name}
                      </div>
                      <div style={{ color: "#64748B", fontSize: 14, marginTop: 8 }}>
                        {formatDocument(data.client?.document || "")}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 12,
                        alignContent: "start",
                      }}
                    >
                      <div
                        style={{
                          padding: 14,
                          borderRadius: 18,
                          background: "rgba(99,102,241,0.10)",
                          border: "1px solid rgba(99,102,241,0.18)",
                        }}
                      >
                        <div style={{ color: "#94A3B8", fontSize: 12 }}>Processos liberados</div>
                        <div
                          style={{
                            color: "#F8FAFC",
                            fontSize: 28,
                            fontWeight: 800,
                            marginTop: 8,
                          }}
                        >
                          {processCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  {data.processes?.length ? (
                    data.processes.map((p) => {
                      const tone = getStatusTone(p.status);

                      return (
                        <div
                          key={p.id}
                          style={{
                            borderRadius: 28,
                            padding: 22,
                            background:
                              "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
                            border: "1px solid rgba(255,255,255,0.06)",
                            boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
                            backdropFilter: "blur(14px)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex", flexDirection: isMobile ? "column" : "row",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 16,
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ display: "grid", gap: 8 }}>
                              <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 700 }}>
                                PROCESSO
                              </div>
                              <div style={{ color: "#F8FAFC", fontSize: 22, fontWeight: 800 }}>
                                {p.cnj}
                              </div>
                              <div style={{ color: "#64748B", fontSize: 14 }}>
                                {[p.tribunal, p.vara].filter(Boolean).join(" · ") || "Informações do órgão não disponíveis"}
                              </div>
                            </div>

                            <span
                              style={{
                                padding: "10px 14px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 800,
                                whiteSpace: "nowrap",
                                ...tone,
                              }}
                            >
                              {p.status}
                            </span>
                          </div>

                          <div style={{ marginTop: 20 }}>
                            <div style={{ color: "#F8FAFC", fontSize: 16, fontWeight: 800 }}>
                              Últimas atualizações
                            </div>

                            {p.updates.length === 0 ? (
                              <div
                                style={{
                                  marginTop: 12,
                                  padding: 16,
                                  borderRadius: 18,
                                  background: "rgba(255,255,255,0.03)",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                  color: "#94A3B8",
                                  fontSize: 14,
                                }}
                              >
                                Sem atualizações visíveis no momento.
                              </div>
                            ) : (
                              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                                {p.updates.map((u, idx) => (
                                  <div
                                    key={`${p.id}-${idx}`}
                                    style={{
                                      padding: 16,
                                      borderRadius: 18,
                                      background: "rgba(255,255,255,0.03)",
                                      border: "1px solid rgba(255,255,255,0.05)",
                                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
                                    }}
                                  >
                                    <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 700 }}>
                                      {formatDateTime(u.date)}
                                    </div>
                                    <div
                                      style={{
                                        color: "#E2E8F0",
                                        fontSize: 14,
                                        lineHeight: 1.7,
                                        marginTop: 8,
                                      }}
                                    >
                                      {u.text}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        borderRadius: 28,
                        padding: 24,
                        background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow: "0 20px 40px rgba(0,0,0,0.28)",
                        backdropFilter: "blur(14px)",
                        color: "#94A3B8",
                      }}
                    >
                      Nenhum processo visível para este acesso no momento.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

