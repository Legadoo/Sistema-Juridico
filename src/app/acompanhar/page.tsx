"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaCircleInfo,
  FaClock,
  FaFileLines,
  FaFolderOpen,
  FaIdCard,
  FaLock,
  FaMagnifyingGlass,
  FaScaleBalanced,
  FaShieldHalved,
  FaUserShield,
} from "react-icons/fa6";

type ProcessItem = {
  id: string;
  cnj: string;
  tribunal?: string | null;
  vara?: string | null;
  status: string;
  updates: Array<{
    date: string;
    text: string;
  }>;
};

type TrackResp = {
  ok: boolean;
  message?: string;
  client?: {
    name: string;
    document: string;
    processes?: ProcessItem[];
  };
  processes?: ProcessItem[];
};

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
};

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function formatDocument(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

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
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusTone(status: string) {
  const s = (status || "").toLowerCase();

  if (s.includes("andamento") || s.includes("ativo") || s.includes("tramita")) {
    return {
      background: "rgba(56,189,248,0.10)",
      border: "1px solid rgba(56,189,248,0.24)",
      color: "#BAE6FD",
    };
  }

  if (s.includes("conclu") || s.includes("baixad") || s.includes("encerr")) {
    return {
      background: "rgba(16,185,129,0.10)",
      border: "1px solid rgba(16,185,129,0.24)",
      color: "#A7F3D0",
    };
  }

  if (s.includes("aten") || s.includes("pend")) {
    return {
      background: "rgba(245,158,11,0.10)",
      border: "1px solid rgba(245,158,11,0.24)",
      color: "#FDE68A",
    };
  }

  return {
    background: "rgba(99,102,241,0.10)",
    border: "1px solid rgba(99,102,241,0.24)",
    color: "#C7D2FE",
  };
}

export default function AcompanharPage() {
  const [document, setDocument] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [data, setData] = useState<TrackResp | null>(null);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotId, setSlotId] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function updateViewport() {
      setIsMobile(window.innerWidth < 820);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const processes = useMemo(() => {
    return data?.processes || data?.client?.processes || [];
  }, [data]);

  const processCount = processes.length;

  async function carregarSlots(doc: string, codeValue: string) {
    const res = await fetch("/api/public/appointments/slots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        document: onlyDigits(doc),
        accessCode: codeValue,
      }),
    })
      .then(async (r) => ({
        ok: r.ok,
        d: await r.json().catch(() => null),
      }))
      .catch(() => null);

    if (!res || !res.ok || !res.d?.ok) {
      setSlots([]);
      return;
    }

    setSlots(res.d.slots || []);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMsg(null);
    setData(null);
    setSlots([]);
    setSlotId("");
    setLoading(true);

    const cleanDocument = onlyDigits(document);
    const cleanAccessCode = accessCode.trim();

    const res = await fetch("/api/public/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        document: cleanDocument,
        code: cleanAccessCode,
        accessCode: cleanAccessCode,
      }),
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
    await carregarSlots(cleanDocument, cleanAccessCode);
  }

  async function reservarHorario(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!slotId) {
      setMsg("Selecione um horário.");
      return;
    }

    setBookingLoading(true);

    const res = await fetch("/api/public/appointments/book", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        document: onlyDigits(document),
        accessCode: accessCode.trim(),
        slotId,
        notes: bookingNotes,
      }),
    })
      .then(async (r) => ({
        ok: r.ok,
        d: await r.json().catch(() => null),
      }))
      .catch(() => null);

    setBookingLoading(false);

    if (!res || !res.ok || !res.d?.ok) {
      setMsg(res?.d?.message || "Não foi possível reservar o horário.");
      return;
    }

    setMsg("Agendamento realizado com sucesso.");
    setSlotId("");
    setBookingNotes("");
    await carregarSlots(onlyDigits(document), accessCode.trim());
  }

  return (
    <main className="jv-track-page">
      <style>{`
        :root {
          --jv-blue: #1677ff;
          --jv-cyan: #38bdf8;
          --jv-text: #f8fafc;
          --jv-muted: #94a3b8;
          --jv-border: rgba(148, 163, 184, 0.22);
          --jv-card: rgba(15, 23, 42, 0.62);
        }

        .jv-track-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: var(--jv-text);
          font-family: Arial, Helvetica, sans-serif;
          background:
            radial-gradient(circle at 85% 6%, rgba(22,119,255,.24), transparent 26%),
            radial-gradient(circle at 7% 86%, rgba(22,119,255,.28), transparent 26%),
            linear-gradient(135deg, #020617 0%, #07111f 46%, #020617 100%);
        }

        .jv-track-page * {
          box-sizing: border-box;
        }

        .jv-track-page::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .36;
          background-image:
            linear-gradient(rgba(56,189,248,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,.035) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: linear-gradient(to bottom, black, transparent 82%);
        }

        .jv-track-page::after {
          content: "";
          position: absolute;
          width: 760px;
          height: 760px;
          right: -250px;
          top: 140px;
          border-radius: 999px;
          border: 1px solid rgba(22,119,255,.16);
          pointer-events: none;
        }

        .jv-track-shell {
          position: relative;
          z-index: 1;
          width: min(1460px, calc(100% - 72px));
          margin: 0 auto;
          padding: 34px 0 52px;
          display: grid;
          gap: 24px;
        }

        .jv-hero {
          min-height: 260px;
          position: relative;
          overflow: hidden;
          padding: 38px 44px;
          border-radius: 28px;
          border: 1px solid rgba(22,119,255,.34);
          background:
            radial-gradient(circle at 88% 18%, rgba(14,165,233,.24), transparent 21%),
            linear-gradient(135deg, rgba(7,17,31,.96), rgba(7,17,31,.74));
          box-shadow: 0 32px 80px rgba(0,0,0,.38);
        }

        .jv-hero::before {
          content: "";
          position: absolute;
          right: 70px;
          top: 38px;
          width: 360px;
          height: 190px;
          opacity: .24;
          background:
            radial-gradient(circle at 65% 56%, rgba(22,119,255,.9), transparent 12%),
            linear-gradient(90deg, transparent, rgba(14,165,233,.36), transparent);
          filter: blur(.2px);
        }

        .jv-hero::after {
          content: "⚖";
          position: absolute;
          right: 150px;
          top: 70px;
          color: rgba(56,189,248,.44);
          font-size: 112px;
          text-shadow: 0 0 40px rgba(22,119,255,.42);
        }

        .jv-logo {
          width: 300px;
          height: auto;
          display: block;
          margin-bottom: 28px;
        }

        .jv-kicker {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          padding: 9px 14px;
          border-radius: 999px;
          border: 1px solid rgba(56,189,248,.30);
          background: linear-gradient(135deg, rgba(22,119,255,.62), rgba(124,58,237,.40));
          color: #e0f2fe;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        .jv-hero h1 {
          max-width: 720px;
          margin: 22px 0 0;
          font-size: clamp(38px, 4.8vw, 58px);
          line-height: 1.02;
          letter-spacing: -0.06em;
          font-weight: 950;
        }

        .jv-hero p {
          max-width: 820px;
          margin: 20px 0 0;
          color: #cbd5e1;
          font-size: 18px;
          line-height: 1.7;
        }

        .jv-main-grid {
          display: grid;
          grid-template-columns: 560px 1fr;
          gap: 26px;
          align-items: start;
        }

        .jv-card {
          border-radius: 28px;
          border: 1px solid rgba(148,163,184,.20);
          background:
            radial-gradient(circle at top left, rgba(22,119,255,.10), transparent 24%),
            linear-gradient(180deg, rgba(7,17,31,.88), rgba(3,7,18,.84));
          box-shadow: 0 24px 60px rgba(0,0,0,.32);
          backdrop-filter: blur(16px);
        }

        .jv-form-card {
          padding: 28px;
        }

        .jv-card-title {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .jv-icon-box {
          width: 56px;
          height: 56px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 16px;
          color: #dbeafe;
          background: linear-gradient(135deg, rgba(22,119,255,.96), rgba(14,165,233,.44));
          box-shadow: 0 18px 45px rgba(22,119,255,.22);
          font-size: 24px;
        }

        .jv-card-title h2 {
          margin: 0;
          font-size: 30px;
          line-height: 1.08;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .jv-card-title p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.5;
        }

        .jv-form {
          display: grid;
          gap: 18px;
        }

        .jv-field {
          display: grid;
          gap: 8px;
        }

        .jv-field label {
          color: #f8fafc;
          font-size: 15px;
          font-weight: 900;
        }

        .jv-input-wrap,
        .jv-select,
        .jv-textarea {
          border-radius: 14px;
          border: 1px solid rgba(148,163,184,.25);
          background: rgba(15,23,42,.72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
        }

        .jv-input-wrap {
          min-height: 64px;
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 14px;
          padding: 0 18px;
        }

        .jv-input-wrap svg {
          color: #94a3b8;
          font-size: 20px;
        }

        .jv-input-wrap input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #fff;
          font-size: 17px;
        }

        .jv-input-wrap input::placeholder,
        .jv-textarea::placeholder {
          color: #94a3b8;
        }

        .jv-primary-button {
          width: 100%;
          min-height: 66px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border: 0;
          border-radius: 14px;
          color: white;
          cursor: pointer;
          font-size: 17px;
          font-weight: 950;
          background: linear-gradient(135deg, #1677ff, #7c3aed);
          box-shadow: 0 24px 55px rgba(22,119,255,.28);
          transition: transform .2s ease, opacity .2s ease;
        }

        .jv-primary-button:hover {
          transform: translateY(-2px);
        }

        .jv-primary-button:disabled {
          opacity: .62;
          cursor: not-allowed;
          transform: none;
        }

        .jv-note {
          margin-top: 22px;
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: center;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid rgba(56,189,248,.18);
          background: rgba(15,23,42,.56);
          color: #bfdbfe;
          font-size: 16px;
          line-height: 1.55;
        }

        .jv-note svg {
          color: #38bdf8;
          font-size: 28px;
        }

        .jv-message {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(56,189,248,.22);
          background: rgba(14,165,233,.08);
          color: #bae6fd;
          font-size: 14px;
          line-height: 1.6;
        }

        .jv-result-card {
          min-height: 472px;
          padding: 30px;
          display: grid;
          align-content: center;
        }

        .jv-empty-state {
          max-width: 720px;
          margin: 0 auto;
          text-align: center;
        }

        .jv-scale-circle {
          width: 112px;
          height: 112px;
          display: grid;
          place-items: center;
          margin: 0 auto 28px;
          border-radius: 999px;
          border: 1px solid rgba(56,189,248,.24);
          background:
            radial-gradient(circle at center, rgba(22,119,255,.36), transparent 70%),
            rgba(15,23,42,.78);
          box-shadow: 0 22px 50px rgba(22,119,255,.20);
          color: #60a5fa;
          font-size: 46px;
        }

        .jv-empty-state h2 {
          margin: 0;
          font-size: 32px;
          letter-spacing: -0.04em;
          font-weight: 950;
        }

        .jv-empty-state p {
          max-width: 620px;
          margin: 20px auto 0;
          color: #cbd5e1;
          font-size: 17px;
          line-height: 1.7;
        }

        .jv-results {
          display: grid;
          gap: 20px;
          align-content: start;
        }

        .jv-client-box {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 16px;
          align-items: center;
          padding: 20px;
          border-radius: 20px;
          border: 1px solid rgba(56,189,248,.20);
          background: rgba(15,23,42,.62);
        }

        .jv-client-box h2 {
          margin: 0;
          font-size: 24px;
          letter-spacing: -0.03em;
        }

        .jv-client-box p {
          margin: 6px 0 0;
          color: #94a3b8;
        }

        .jv-count {
          padding: 10px 14px;
          border-radius: 999px;
          color: #bfdbfe;
          font-size: 13px;
          font-weight: 900;
          background: rgba(22,119,255,.16);
          border: 1px solid rgba(56,189,248,.24);
          white-space: nowrap;
        }

        .jv-process-card {
          padding: 20px;
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,.18);
          background: rgba(15,23,42,.56);
        }

        .jv-process-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 14px;
        }

        .jv-process-head h3 {
          margin: 0;
          font-size: 18px;
          letter-spacing: -0.02em;
        }

        .jv-process-head p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.55;
        }

        .jv-status-pill {
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .jv-update-list {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .jv-update {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          padding: 12px;
          border-radius: 14px;
          background: rgba(2,6,23,.34);
          border: 1px solid rgba(148,163,184,.10);
        }

        .jv-update svg {
          color: #38bdf8;
          margin-top: 2px;
        }

        .jv-update strong {
          display: block;
          color: #e2e8f0;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .jv-update span {
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.55;
        }

        .jv-booking-card {
          padding: 22px;
          border-radius: 22px;
          border: 1px solid rgba(56,189,248,.18);
          background: rgba(15,23,42,.54);
        }

        .jv-booking-card h3 {
          margin: 0 0 14px;
          font-size: 22px;
          letter-spacing: -0.03em;
        }

        .jv-select,
        .jv-textarea {
          width: 100%;
          color: white;
          outline: 0;
          padding: 14px 16px;
          font-size: 15px;
        }

        .jv-select option {
          background: #0f172a;
          color: white;
        }

        .jv-textarea {
          min-height: 96px;
          resize: vertical;
        }

        @media (max-width: 1100px) {
          .jv-main-grid {
            grid-template-columns: 1fr;
          }

          .jv-result-card {
            min-height: 360px;
          }
        }

        @media (max-width: 720px) {
          .jv-track-shell {
            width: min(100% - 28px, 1460px);
            padding: 18px 0 34px;
            gap: 18px;
          }

          .jv-hero {
            min-height: auto;
            padding: 26px 22px;
            border-radius: 22px;
          }

          .jv-hero::after,
          .jv-hero::before {
            opacity: .12;
            right: 18px;
            top: 48px;
          }

          .jv-logo {
            width: 220px;
            margin-bottom: 24px;
          }

          .jv-kicker {
            font-size: 11px;
            padding: 8px 12px;
          }

          .jv-hero h1 {
            font-size: 38px;
            line-height: 1.08;
          }

          .jv-hero p {
            font-size: 15px;
            line-height: 1.65;
          }

          .jv-form-card,
          .jv-result-card {
            padding: 22px;
            border-radius: 22px;
          }

          .jv-card-title {
            align-items: flex-start;
          }

          .jv-card-title h2 {
            font-size: 25px;
          }

          .jv-input-wrap {
            min-height: 58px;
          }

          .jv-input-wrap input {
            font-size: 15px;
          }

          .jv-primary-button {
            min-height: 58px;
            font-size: 15px;
          }

          .jv-note {
            font-size: 14px;
          }

          .jv-client-box {
            grid-template-columns: 1fr;
          }

          .jv-process-head {
            flex-direction: column;
          }

          .jv-empty-state h2 {
            font-size: 26px;
          }

          .jv-empty-state p {
            font-size: 15px;
          }

          .jv-scale-circle {
            width: 88px;
            height: 88px;
            font-size: 36px;
          }
        }
      `}</style>

      <div className="jv-track-shell">
        <section className="jv-hero">
          <img className="jv-logo" src="/brand/logo-juridicvas.svg" alt="JuridicVas" />

          <div className="jv-kicker">
            <FaUserShield />
            Área do cliente
          </div>

          <h1>Acompanhar processo</h1>

          <p>
            Consulte suas informações com segurança usando o CPF/CNPJ e o código
            fornecido pelo escritório.
          </p>
        </section>

        <section className="jv-main-grid">
          <aside className="jv-card jv-form-card">
            <div className="jv-card-title">
              <div className="jv-icon-box">
                <FaLock />
              </div>

              <div>
                <h2>Consultar acesso</h2>
                <p>Digite seus dados exatamente como informados pelo escritório.</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="jv-form">
              <div className="jv-field">
                <label htmlFor="document">CPF ou CNPJ</label>
                <div className="jv-input-wrap">
                  <FaIdCard />
                  <input
                    id="document"
                    value={document}
                    onChange={(e) => setDocument(formatDocument(e.target.value))}
                    placeholder="Digite seu CPF ou CNPJ"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="jv-field">
                <label htmlFor="accessCode">Código de acesso</label>
                <div className="jv-input-wrap">
                  <FaLock />
                  <input
                    id="accessCode"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Código informado pelo escritório"
                  />
                </div>
              </div>

              {msg ? <div className="jv-message">{msg}</div> : null}

              <button type="submit" className="jv-primary-button" disabled={loading}>
                <FaMagnifyingGlass />
                {loading ? "Consultando..." : "Consultar agora"}
              </button>
            </form>

            <div className="jv-note">
              <FaShieldHalved />
              <div>Esta área mostra apenas informações liberadas pelo escritório.</div>
            </div>
          </aside>

          <section className="jv-card jv-result-card">
            {!data?.ok ? (
              <div className="jv-empty-state">
                <div className="jv-scale-circle">
                  <FaScaleBalanced />
                </div>

                <h2>Consulta protegida</h2>

                <p>
                  Após informar seus dados, você verá aqui os processos liberados,
                  o status atual, as últimas atualizações e os horários disponíveis.
                </p>
              </div>
            ) : (
              <div className="jv-results">
                <div className="jv-client-box">
                  <div className="jv-icon-box">
                    <FaUserShield />
                  </div>

                  <div>
                    <h2>{data.client?.name || "Cliente localizado"}</h2>
                    <p>{data.client?.document || document}</p>
                  </div>

                  <div className="jv-count">
                    {processCount} processo{processCount === 1 ? "" : "s"}
                  </div>
                </div>

                {processes.length ? (
                  processes.map((processo) => {
                    const tone = getStatusTone(processo.status);

                    return (
                      <article className="jv-process-card" key={processo.id}>
                        <div className="jv-process-head">
                          <div>
                            <h3>{processo.cnj}</h3>
                            <p>
                              {processo.tribunal || "Tribunal não informado"}
                              {processo.vara ? ` • ${processo.vara}` : ""}
                            </p>
                          </div>

                          <div className="jv-status-pill" style={tone}>
                            {processo.status || "Status não informado"}
                          </div>
                        </div>

                        <div className="jv-update-list">
                          {processo.updates?.length ? (
                            processo.updates.map((update, index) => (
                              <div className="jv-update" key={`${processo.id}-${index}`}>
                                <FaFileLines />
                                <div>
                                  <strong>{formatDateTime(update.date)}</strong>
                                  <span>{update.text}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="jv-update">
                              <FaCircleInfo />
                              <div>
                                <strong>Sem atualizações públicas</strong>
                                <span>
                                  Ainda não há atualização liberada para este processo.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="jv-process-card">
                    <div className="jv-update">
                      <FaCircleInfo />
                      <div>
                        <strong>Nenhum processo liberado</strong>
                        <span>
                          O acesso foi validado, mas ainda não há processos públicos
                          liberados pelo escritório.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {slots.length ? (
                  <form onSubmit={reservarHorario} className="jv-booking-card">
                    <h3>Horários disponíveis</h3>

                    <div className="jv-form">
                      <div className="jv-field">
                        <label htmlFor="slotId">Escolha um horário</label>
                        <select
                          id="slotId"
                          className="jv-select"
                          value={slotId}
                          onChange={(e) => setSlotId(e.target.value)}
                        >
                          <option value="">Selecione um horário</option>
                          {slots.map((slot) => (
                            <option key={slot.id} value={slot.id}>
                              {formatDateTime(slot.startAt)} até {formatDateTime(slot.endAt)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="jv-field">
                        <label htmlFor="bookingNotes">Observações</label>
                        <textarea
                          id="bookingNotes"
                          className="jv-textarea"
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          placeholder="Escreva uma observação, se necessário"
                        />
                      </div>

                      <button
                        type="submit"
                        className="jv-primary-button"
                        disabled={bookingLoading}
                      >
                        <FaCalendarCheck />
                        {bookingLoading ? "Reservando..." : "Reservar horário"}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
