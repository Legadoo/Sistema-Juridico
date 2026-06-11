"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaClock,
  FaCircleCheck,
  FaEye,
  FaLock,
  FaRotateLeft,
  FaTrash,
  FaXmark,
} from "react-icons/fa6";
import AdminShell from "@/components/AdminShell";
import PremiumModal from "@/components/PremiumModal";
import PremiumToast from "@/components/PremiumToast";

type MeState = {
  user: {
    id: string;
    name: string;
    role: string;
  };
  firm?: {
    name?: string;
  } | null;
};

type SlotRow = {
  id: string;
  startAt: string;
  endAt: string;
  isBooked: boolean;
  isActive: boolean;
};

type WindowRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  isActive: boolean;
  notes?: string | null;
  slots: SlotRow[];
};

type FiltroStatus = "todas" | "ativas" | "canceladas";

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type ActionTarget =
  | { type: "cancelWindow"; id: string; title: string }
  | { type: "reactivateWindow"; id: string; title: string }
  | { type: "deleteWindow"; id: string; title: string }
  | { type: "deactivateSlot"; id: string; title: string }
  | { type: "reactivateSlot"; id: string; title: string }
  | { type: "deleteSlot"; id: string; title: string }
  | null;

export default function AvailabilityPage() {
  const [me, setMe] = useState<MeState | null>(null);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState("30");
  const [notes, setNotes] = useState("");

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todas");
  const [search, setSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);
  const [runningAction, setRunningAction] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [meRes, windowsRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store", credentials: "include" })
          .then((r) => r.json())
          .catch(() => null),
        fetch("/api/admin/availability", { cache: "no-store", credentials: "include" })
          .then((r) => r.json())
          .catch(() => null),
      ]);

      if (meRes?.ok) {
        setMe(meRes);
      }

      if (windowsRes?.ok) {
        setWindows(windowsRes.windows || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const totalSlots = windows.reduce((sum, item) => sum + item.slots.length, 0);
    const bookedSlots = windows.reduce(
      (sum, item) => sum + item.slots.filter((slot) => slot.isBooked).length,
      0
    );
    const activeWindows = windows.filter((item) => item.isActive).length;
    const availableSlots = windows.reduce(
      (sum, item) =>
        sum +
        item.slots.filter((slot) => item.isActive && slot.isActive && !slot.isBooked).length,
      0
    );

    return {
      windows: windows.length,
      activeWindows,
      totalSlots,
      bookedSlots,
      availableSlots,
    };
  }, [windows]);

  const windowsFiltradas = useMemo(() => {
    const term = search
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return windows.filter((item) => {
      if (filtroStatus === "ativas" && !item.isActive) return false;
      if (filtroStatus === "canceladas" && item.isActive) return false;

      if (!term) return true;

      const text = `${formatDate(item.date)} ${item.startTime} ${item.endTime} ${item.notes || ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      return text.includes(term);
    });
  }, [windows, filtroStatus, search]);

  function showToast(message: string, type: ToastState["type"] = "info") {
    setToast({ open: true, message, type });
  }

  function formatDate(value: string) {
    const d = new Date(value);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  }

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  }

  function slotStatus(slot: SlotRow) {
    if (slot.isBooked) return "Reservado";
    if (!slot.isActive) return "Desativado";
    return "Disponível";
  }

  function slotClass(slot: SlotRow) {
    if (slot.isBooked) return "jv-pill-blue";
    if (!slot.isActive) return "jv-pill-red";
    return "jv-pill-green";
  }

  async function createWindow() {
    if (!date || !startTime || !endTime) {
      showToast("Preencha data, horário inicial e horário final.", "warning");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/admin/availability", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date,
        startTime,
        endTime,
        slotIntervalMinutes: Number(slotIntervalMinutes),
        notes,
      }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    setSaving(false);

    if (!res || !res.ok || !res.d.ok) {
      showToast(res?.d?.message || "Erro ao abrir agenda.", "error");
      return;
    }

    setDate("");
    setStartTime("09:00");
    setEndTime("12:00");
    setSlotIntervalMinutes("30");
    setNotes("");
    showToast("Abertura de agenda criada com sucesso.", "success");
    await load();
  }

  async function runAction() {
    if (!actionTarget) return;

    setRunningAction(true);

    const endpoint =
      actionTarget.type === "deactivateSlot" ||
      actionTarget.type === "reactivateSlot" ||
      actionTarget.type === "deleteSlot"
        ? `/api/admin/availability/slots/${actionTarget.id}`
        : `/api/admin/availability/${actionTarget.id}`;

    const method =
      actionTarget.type === "deleteWindow" || actionTarget.type === "deleteSlot"
        ? "DELETE"
        : "PATCH";

    const actionMap: Record<string, string> = {
      cancelWindow: "cancelar",
      reactivateWindow: "reativar",
      deactivateSlot: "desativar",
      reactivateSlot: "reativar",
    };

    const res = await fetch(endpoint, {
      method,
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: method === "PATCH" ? JSON.stringify({ action: actionMap[actionTarget.type] }) : undefined,
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    setRunningAction(false);

    if (!res || !res.ok || !res.d.ok) {
      showToast(res?.d?.message || "Erro ao executar ação.", "error");
      return;
    }

    setActionTarget(null);
    showToast(res.d.message || "Ação realizada com sucesso.", "success");
    await load();
  }

  if (loading && !me) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#fff" }}>
        Carregando abertura de agenda...
      </div>
    );
  }

  if (!me) {
    return <div>Não foi possível carregar a sessão.</div>;
  }

  return (
    <AdminShell
      userName={me.user.name}
      role={me.user.role}
      firmName={me.firm?.name || "Advocacia"}
    >
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PremiumModal
        open={!!actionTarget}
        onClose={() => {
          if (!runningAction) setActionTarget(null);
        }}
        title="Confirmar ação"
        description="Confirme a alteração nesta abertura ou horário."
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setActionTarget(null)}
              disabled={runningAction}
            >
              Cancelar
            </button>

            <button
              className="jv-premium-btn"
              onClick={runAction}
              disabled={runningAction}
            >
              {runningAction ? "Processando..." : "Confirmar"}
            </button>
          </>
        }
        size="sm"
      >
        <div className="jv-confirm-box">
          <strong>{actionTarget?.title}</strong>
          <span>Essa ação será refletida nos horários que aparecem para o cliente no /acompanhar.</span>
        </div>
      </PremiumModal>

      <div className="jv-availability-page">
        <style>{`
          .jv-availability-page {
            display: grid;
            gap: 20px;
          }

          .jv-availability-page * {
            box-sizing: border-box;
          }

          .jv-hero {
            min-height: 230px;
            position: relative;
            overflow: hidden;
            border-radius: 28px;
            border: 1px solid rgba(168,85,247,0.22);
            background:
              linear-gradient(90deg, rgba(7,10,23,0.96), rgba(12,15,31,0.84), rgba(17,24,39,0.72)),
              radial-gradient(circle at 82% 17%, rgba(124,58,237,0.34), transparent 32%),
              linear-gradient(135deg, #090b16, #111827);
            box-shadow: 0 34px 90px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.045);
            padding: 34px 38px;
          }

          .jv-hero-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            flex-wrap: wrap;
          }

          .jv-kicker {
            width: fit-content;
            color: #c4b5fd;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jv-title {
            margin: 16px 0 0;
            color: #f8fafc;
            font-size: clamp(36px, 4vw, 54px);
            font-weight: 950;
            line-height: 0.98;
            letter-spacing: -0.06em;
          }

          .jv-subtitle {
            margin: 12px 0 0;
            color: #cbd5e1;
            font-size: 16px;
            line-height: 1.7;
            max-width: 900px;
          }

          .jv-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .jv-stat-card {
            min-height: 128px;
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: 16px;
            padding: 20px;
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.16);
            background:
              radial-gradient(circle at 95% 5%, rgba(124,58,237,0.18), transparent 32%),
              linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.64));
            box-shadow: 0 26px 60px rgba(0,0,0,0.27);
          }

          .jv-stat-icon {
            width: 58px;
            height: 58px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            color: #d8b4fe;
            background: radial-gradient(circle, rgba(168,85,247,0.40), rgba(15,23,42,0.70));
            font-size: 24px;
          }

          .jv-stat-title {
            color: #a1a1aa;
            font-size: 13px;
          }

          .jv-stat-value {
            margin-top: 6px;
            color: #f8fafc;
            font-size: 34px;
            font-weight: 950;
            line-height: 1;
          }

          .jv-stat-subtitle {
            margin-top: 8px;
            color: #a1a1aa;
            font-size: 13px;
          }

          .jv-panel {
            border-radius: 24px;
            border: 1px solid rgba(168,85,247,0.22);
            background:
              radial-gradient(circle at 0% 0%, rgba(124,58,237,0.11), transparent 30%),
              linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.56));
            box-shadow: 0 28px 70px rgba(0,0,0,0.26);
            padding: 22px;
          }

          .jv-panel-title {
            color: #f8fafc;
            font-size: 24px;
            font-weight: 950;
            letter-spacing: -0.045em;
            margin-bottom: 14px;
          }

          .jv-form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 12px;
          }

          .jv-input,
          .jv-textarea,
          .jv-select {
            width: 100%;
            min-height: 52px;
            border-radius: 16px;
            border: 1px solid rgba(148,163,184,0.16);
            background: rgba(15,23,42,0.72);
            color: #f8fafc;
            padding: 0 15px;
            outline: none;
            color-scheme: dark;
          }

          .jv-textarea {
            grid-column: 1 / -1;
            min-height: 110px;
            padding: 14px 15px;
            resize: vertical;
          }

          .jv-primary,
          .jv-secondary,
          .jv-danger,
          .jv-success {
            min-height: 46px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            border-radius: 14px;
            padding: 0 16px;
            cursor: pointer;
            font-weight: 950;
            text-decoration: none;
          }

          .jv-primary {
            border: 0;
            color: #fff;
            background: linear-gradient(135deg, #a855f7, #4f46e5);
            box-shadow: 0 18px 40px rgba(79,70,229,0.22);
          }

          .jv-secondary {
            color: #e5e7eb;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(148,163,184,0.15);
          }

          .jv-danger {
            color: #fecaca;
            background: rgba(127,29,29,0.18);
            border: 1px solid rgba(248,113,113,0.25);
          }

          .jv-success {
            color: #a7f3d0;
            background: rgba(6,78,59,0.18);
            border: 1px solid rgba(52,211,153,0.24);
          }

          .jv-filters {
            display: grid;
            grid-template-columns: minmax(280px, 1fr) auto;
            gap: 12px;
            margin-bottom: 18px;
          }

          .jv-search-box {
            min-height: 52px;
            display: flex;
            align-items: center;
            border-radius: 16px;
            border: 1px solid rgba(148,163,184,0.16);
            background: rgba(15,23,42,0.62);
            padding: 0 15px;
          }

          .jv-search-box input {
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #f8fafc;
          }

          .jv-mode-tabs {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .jv-mode-tab {
            min-height: 52px;
            border-radius: 16px;
            border: 1px solid rgba(148,163,184,0.16);
            background: rgba(255,255,255,0.035);
            color: #cbd5e1;
            padding: 0 14px;
            cursor: pointer;
            font-weight: 900;
          }

          .jv-mode-tab-active {
            color: #fff;
            border-color: rgba(168,85,247,0.45);
            background: linear-gradient(135deg, rgba(124,58,237,0.32), rgba(59,130,246,0.12));
          }

          .jv-window-list {
            display: grid;
            gap: 14px;
          }

          .jv-window-card {
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.13);
            background: rgba(255,255,255,0.035);
            padding: 18px;
          }

          .jv-window-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 14px;
            flex-wrap: wrap;
          }

          .jv-window-title {
            color: #f8fafc;
            font-size: 19px;
            font-weight: 950;
          }

          .jv-window-meta {
            margin-top: 6px;
            color: #94a3b8;
            font-size: 13px;
            line-height: 1.6;
          }

          .jv-pills,
          .jv-actions,
          .jv-slots {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .jv-pills {
            margin-top: 12px;
          }

          .jv-actions {
            justify-content: flex-end;
          }

          .jv-slots {
            margin-top: 14px;
          }

          .jv-pill {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 8px 11px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
          }

          .jv-pill-purple {
            color: #ddd6fe;
            background: rgba(124,58,237,0.13);
            border: 1px solid rgba(168,85,247,0.24);
          }

          .jv-pill-blue {
            color: #bfdbfe;
            background: rgba(59,130,246,0.13);
            border: 1px solid rgba(96,165,250,0.24);
          }

          .jv-pill-green {
            color: #a7f3d0;
            background: rgba(6,78,59,0.18);
            border: 1px solid rgba(52,211,153,0.24);
          }

          .jv-pill-red {
            color: #fecaca;
            background: rgba(127,29,29,0.18);
            border: 1px solid rgba(248,113,113,0.24);
          }

          .jv-slot-card {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 9px 11px;
            border-radius: 14px;
            border: 1px solid rgba(148,163,184,0.14);
            background: rgba(15,23,42,0.60);
            color: #e2e8f0;
            font-size: 12px;
            font-weight: 850;
          }

          .jv-slot-actions {
            display: inline-flex;
            gap: 5px;
          }

          .jv-mini-btn {
            border: 0;
            width: 25px;
            height: 25px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            cursor: pointer;
            color: #fff;
            background: rgba(255,255,255,0.08);
          }

          .jv-confirm-box {
            display: grid;
            gap: 8px;
            padding: 16px;
            border-radius: 18px;
            background: rgba(255,255,255,0.035);
            border: 1px solid rgba(148,163,184,0.16);
            color: #e2e8f0;
          }

          .jv-confirm-box strong {
            color: #f8fafc;
          }

          .jv-confirm-box span {
            color: #94a3b8;
            line-height: 1.6;
          }

          .jv-empty {
            padding: 20px;
            border-radius: 18px;
            background: rgba(255,255,255,0.035);
            border: 1px dashed rgba(148,163,184,0.22);
            color: #94a3b8;
            text-align: center;
          }

          @media (max-width: 1100px) {
            .jv-stats-grid,
            .jv-form-grid,
            .jv-filters {
              grid-template-columns: 1fr;
            }

            .jv-actions {
              justify-content: flex-start;
            }
          }

          @media (max-width: 640px) {
            .jv-hero {
              padding: 28px 22px;
              min-height: auto;
            }

            .jv-primary,
            .jv-secondary,
            .jv-danger,
            .jv-success {
              width: 100%;
            }

            .jv-actions {
              display: grid;
            }

            .jv-mode-tabs {
              display: grid;
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <section className="jv-hero">
          <div className="jv-hero-content">
            <div>
              <div className="jv-kicker">Agenda pública</div>

              <h1 className="jv-title">Abertura de agenda</h1>

              <p className="jv-subtitle">
                Defina os dias e horários que ficarão disponíveis para o cliente marcar
                atendimento pelo /acompanhar. Os horários reservados aparecem automaticamente
                na aba Agendamentos.
              </p>
            </div>
          </div>
        </section>

        <section className="jv-stats-grid">
          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaCalendarCheck /></div>
            <div>
              <div className="jv-stat-title">Aberturas</div>
              <div className="jv-stat-value">{stats.windows}</div>
              <div className="jv-stat-subtitle">Total cadastrado</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaCircleCheck /></div>
            <div>
              <div className="jv-stat-title">Ativas</div>
              <div className="jv-stat-value">{stats.activeWindows}</div>
              <div className="jv-stat-subtitle">Visíveis ao cliente</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaClock /></div>
            <div>
              <div className="jv-stat-title">Disponíveis</div>
              <div className="jv-stat-value">{stats.availableSlots}</div>
              <div className="jv-stat-subtitle">Horários livres</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaLock /></div>
            <div>
              <div className="jv-stat-title">Reservados</div>
              <div className="jv-stat-value">{stats.bookedSlots}</div>
              <div className="jv-stat-subtitle">Agendamentos públicos</div>
            </div>
          </article>
        </section>

        <section className="jv-panel">
          <div className="jv-panel-title">Nova abertura</div>

          <div className="jv-form-grid">
            <input className="jv-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="jv-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <input className="jv-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <input
              className="jv-input"
              type="number"
              min="5"
              max="240"
              step="5"
              value={slotIntervalMinutes}
              onChange={(e) => setSlotIntervalMinutes(e.target.value)}
              placeholder="Intervalo em minutos"
            />
            <textarea
              className="jv-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações internas sobre esta abertura"
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="jv-primary" onClick={createWindow} disabled={saving}>
              {saving ? "Criando..." : "Criar abertura"}
            </button>
          </div>
        </section>

        <section className="jv-panel">
          <div className="jv-panel-title">Aberturas cadastradas</div>

          <div className="jv-filters">
            <label className="jv-search-box">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por data, horário ou observação..."
              />
            </label>

            <div className="jv-mode-tabs">
              <button
                className={filtroStatus === "todas" ? "jv-mode-tab jv-mode-tab-active" : "jv-mode-tab"}
                onClick={() => setFiltroStatus("todas")}
              >
                Todas
              </button>
              <button
                className={filtroStatus === "ativas" ? "jv-mode-tab jv-mode-tab-active" : "jv-mode-tab"}
                onClick={() => setFiltroStatus("ativas")}
              >
                Ativas
              </button>
              <button
                className={filtroStatus === "canceladas" ? "jv-mode-tab jv-mode-tab-active" : "jv-mode-tab"}
                onClick={() => setFiltroStatus("canceladas")}
              >
                Canceladas
              </button>
            </div>
          </div>

          {loading ? (
            <div className="jv-empty">Carregando aberturas...</div>
          ) : windowsFiltradas.length === 0 ? (
            <div className="jv-empty">Nenhuma abertura encontrada para este filtro.</div>
          ) : (
            <div className="jv-window-list">
              {windowsFiltradas.map((item) => (
                <article className="jv-window-card" key={item.id}>
                  <div className="jv-window-head">
                    <div>
                      <div className="jv-window-title">{formatDate(item.date)}</div>
                      <div className="jv-window-meta">
                        {item.startTime} às {item.endTime} · Intervalo de {item.slotIntervalMinutes} minutos
                      </div>

                      {item.notes ? <div className="jv-window-meta">{item.notes}</div> : null}

                      <div className="jv-pills">
                        <span className={item.isActive ? "jv-pill jv-pill-green" : "jv-pill jv-pill-red"}>
                          {item.isActive ? "Ativa" : "Cancelada"}
                        </span>

                        <span className="jv-pill jv-pill-purple">
                          {item.slots.length} horário(s)
                        </span>

                        <span className="jv-pill jv-pill-blue">
                          {item.slots.filter((slot) => slot.isBooked).length} reservado(s)
                        </span>
                      </div>
                    </div>

                    <div className="jv-actions">
                      {item.isActive ? (
                        <button
                          className="jv-danger"
                          onClick={() =>
                            setActionTarget({
                              type: "cancelWindow",
                              id: item.id,
                              title: "Cancelar abertura de agenda",
                            })
                          }
                        >
                          <FaXmark />
                          Cancelar
                        </button>
                      ) : (
                        <button
                          className="jv-success"
                          onClick={() =>
                            setActionTarget({
                              type: "reactivateWindow",
                              id: item.id,
                              title: "Reativar abertura de agenda",
                            })
                          }
                        >
                          <FaRotateLeft />
                          Reativar
                        </button>
                      )}

                      <button
                        className="jv-secondary"
                        onClick={() =>
                          setActionTarget({
                            type: "deleteWindow",
                            id: item.id,
                            title: "Excluir abertura de agenda",
                          })
                        }
                      >
                        <FaTrash />
                        Excluir
                      </button>
                    </div>
                  </div>

                  <div className="jv-slots">
                    {item.slots.map((slot) => (
                      <div className="jv-slot-card" key={slot.id}>
                        <FaEye />
                        {formatDateTime(slot.startAt)} até {formatDateTime(slot.endAt)}
                        <span className={`jv-pill ${slotClass(slot)}`}>{slotStatus(slot)}</span>

                        {!slot.isBooked ? (
                          <span className="jv-slot-actions">
                            {slot.isActive ? (
                              <button
                                className="jv-mini-btn"
                                title="Desativar horário"
                                onClick={() =>
                                  setActionTarget({
                                    type: "deactivateSlot",
                                    id: slot.id,
                                    title: "Desativar horário",
                                  })
                                }
                              >
                                <FaXmark />
                              </button>
                            ) : (
                              <button
                                className="jv-mini-btn"
                                title="Reativar horário"
                                onClick={() =>
                                  setActionTarget({
                                    type: "reactivateSlot",
                                    id: slot.id,
                                    title: "Reativar horário",
                                  })
                                }
                              >
                                <FaRotateLeft />
                              </button>
                            )}

                            <button
                              className="jv-mini-btn"
                              title="Excluir horário"
                              onClick={() =>
                                setActionTarget({
                                  type: "deleteSlot",
                                  id: slot.id,
                                  title: "Excluir horário",
                                })
                              }
                            >
                              <FaTrash />
                            </button>
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}