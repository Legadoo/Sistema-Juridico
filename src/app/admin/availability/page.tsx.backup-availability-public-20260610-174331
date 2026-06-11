"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/AdminShell";

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

export default function AvailabilityPage() {
  const [me, setMe] = useState<MeState | null>(null);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState("30");
  const [notes, setNotes] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todas");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [meRes, windowsRes] = await Promise.all([
        fetch("/api/me").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/availability").then((r) => r.json()).catch(() => null),
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

  async function createWindow(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    const res = await fetch("/api/admin/availability", {
      method: "POST",
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

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao abrir agenda.");
      return;
    }

    setDate("");
    setStartTime("09:00");
    setEndTime("12:00");
    setSlotIntervalMinutes("30");
    setNotes("");
    setMsg("Abertura de agenda criada com sucesso.");
    await load();
  }

  async function cancelarAbertura(id: string) {
    setMsg(null);

    const res = await fetch(`/api/admin/availability/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "cancelar" }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao cancelar abertura.");
      return;
    }

    setMsg("Abertura cancelada com sucesso.");
    await load();
  }

  async function reativarAbertura(id: string) {
    setMsg(null);

    const res = await fetch(`/api/admin/availability/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reativar" }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao reativar abertura.");
      return;
    }

    setMsg("Abertura reativada com sucesso.");
    await load();
  }

  async function excluirAbertura(id: string) {
    setMsg(null);

    const res = await fetch(`/api/admin/availability/${id}`, {
      method: "DELETE",
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao excluir abertura.");
      return;
    }

    setMsg("Abertura excluída com sucesso.");
    await load();
  }

  async function desativarHorario(id: string) {
    setMsg(null);

    const res = await fetch(`/api/admin/availability/slots/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "desativar" }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao desativar horário.");
      return;
    }

    setMsg("Horário desativado com sucesso.");
    await load();
  }

  async function reativarHorario(id: string) {
    setMsg(null);

    const res = await fetch(`/api/admin/availability/slots/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reativar" }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao reativar horário.");
      return;
    }

    setMsg("Horário reativado com sucesso.");
    await load();
  }

  async function excluirHorario(id: string) {
    setMsg(null);

    const res = await fetch(`/api/admin/availability/slots/${id}`, {
      method: "DELETE",
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao excluir horário.");
      return;
    }

    setMsg("Horário excluído com sucesso.");
    await load();
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

  function getStatusLabel(isActive: boolean) {
    return isActive ? "Ativa" : "Cancelada";
  }

  function getStatusColor(isActive: boolean) {
    return isActive ? "#22c55e" : "#ef4444";
  }

  const now = Date.now();

  const windowsFiltradas = useMemo(() => {
    return windows.filter((w) => {
      if (filtroStatus === "ativas") return w.isActive;
      if (filtroStatus === "canceladas") return !w.isActive;
      return true;
    });
  }, [windows, filtroStatus]);

  if (loading && !me) {
    return <div>Carregando...</div>;
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
      <div style={{ display: "grid", gap: 20 }}>
        <section
          style={{
            border: "1px solid #27272a",
            borderRadius: 20,
            padding: 20,
            background: "rgba(24,24,27,0.75)",
            color: "white",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Abertura de agenda</h1>
          <p style={{ marginTop: 8, color: "#d4d4d8" }}>
            Defina o dia, horários e intervalo para gerar automaticamente os atendimentos disponíveis.
          </p>
        </section>

        <section
          style={{
            border: "1px solid #27272a",
            borderRadius: 20,
            padding: 20,
            background: "rgba(255,255,255,0.03)",
            color: "white",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Nova abertura</h2>

          <form onSubmit={createWindow} style={{ display: "grid", gap: 12 }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #3f3f46",
                background: "#09090b",
                color: "white",
              }}
            />

            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #3f3f46",
                background: "#09090b",
                color: "white",
              }}
            />

            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #3f3f46",
                background: "#09090b",
                color: "white",
              }}
            />

            <input
              type="number"
              min="5"
              max="240"
              step="5"
              value={slotIntervalMinutes}
              onChange={(e) => setSlotIntervalMinutes(e.target.value)}
              placeholder="Intervalo em minutos"
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #3f3f46",
                background: "#09090b",
                color: "white",
              }}
            />

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações"
              rows={3}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #3f3f46",
                background: "#09090b",
                color: "white",
                resize: "vertical",
              }}
            />

            {msg ? (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.35)",
                }}
              >
                {msg}
              </div>
            ) : null}

            <button
              type="submit"
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #4f46e5",
                background: "#4f46e5",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              Criar abertura
            </button>
          </form>
        </section>

        <section
          style={{
            border: "1px solid #27272a",
            borderRadius: 20,
            padding: 20,
            background: "rgba(255,255,255,0.03)",
            color: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0 }}>Aberturas cadastradas</h2>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #3f3f46",
                background: "#09090b",
                color: "white",
                colorScheme: "dark",
              }}
            >
              <option value="todas">Todas</option>
              <option value="ativas">Somente ativas</option>
              <option value="canceladas">Somente canceladas</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {windowsFiltradas.map((w) => {
              const slotsVisiveis = w.slots.filter((s) => new Date(s.endAt).getTime() >= now);
              const slotsPassados = w.slots.length - slotsVisiveis.length;

              return (
                <div
                  key={w.id}
                  style={{
                    border: "1px solid #27272a",
                    borderRadius: 16,
                    padding: 16,
                    background: "rgba(9,9,11,0.6)",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 18 }}>
                    {formatDate(w.date)} · {w.startTime} às {w.endTime}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color: getStatusColor(w.isActive),
                      fontWeight: 800,
                    }}
                  >
                    {getStatusLabel(w.isActive)}
                  </div>

                  <div style={{ marginTop: 6, color: "#d4d4d8" }}>
                    Intervalo: {w.slotIntervalMinutes} min
                  </div>

                  {w.notes ? (
                    <div style={{ marginTop: 8, color: "#e4e4e7" }}>{w.notes}</div>
                  ) : null}

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {!w.isActive ? (
                      <button
                        type="button"
                        onClick={() => reativarAbertura(w.id)}
                        style={{
                          padding: "7px 10px",
                          borderRadius: 9,
                          border: "1px solid #22c55e",
                          background: "rgba(34,197,94,0.14)",
                          color: "#22c55e",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Reativar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => cancelarAbertura(w.id)}
                        style={{
                          padding: "7px 10px",
                          borderRadius: 9,
                          border: "1px solid #ef4444",
                          background: "rgba(239,68,68,0.14)",
                          color: "#ef4444",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => excluirAbertura(w.id)}
                      style={{
                        padding: "7px 10px",
                        borderRadius: 9,
                        border: "1px solid #71717a",
                        background: "rgba(113,113,122,0.14)",
                        color: "#e4e4e7",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Excluir
                    </button>
                  </div>

                  {slotsPassados > 0 ? (
                    <div style={{ marginTop: 12, color: "#a1a1aa", fontSize: 13 }}>
                      {slotsPassados} horário(s) passado(s) foram ocultados desta visualização.
                    </div>
                  ) : null}

                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {slotsVisiveis.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid #3f3f46",
                          background: s.isBooked
                            ? "rgba(239,68,68,0.10)"
                            : s.isActive
                            ? "rgba(34,197,94,0.10)"
                            : "rgba(161,161,170,0.10)",
                          color: "white",
                          fontSize: 14,
                        }}
                      >
                        <div>
                          {formatDateTime(s.startAt)} → {formatDateTime(s.endAt)} ·{" "}
                          {s.isBooked ? "Reservado" : s.isActive ? "Disponível" : "Desativado"}
                        </div>

                        {!s.isBooked ? (
                          <div
                            style={{
                              marginTop: 8,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {s.isActive ? (
                              <button
                                type="button"
                                onClick={() => desativarHorario(s.id)}
                                style={{
                                  padding: "6px 9px",
                                  borderRadius: 8,
                                  border: "1px solid #ef4444",
                                  background: "rgba(239,68,68,0.12)",
                                  color: "#ef4444",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                Desativar horário
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => reativarHorario(s.id)}
                                style={{
                                  padding: "6px 9px",
                                  borderRadius: 8,
                                  border: "1px solid #22c55e",
                                  background: "rgba(34,197,94,0.12)",
                                  color: "#22c55e",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                Reativar horário
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => excluirHorario(s.id)}
                              style={{
                                padding: "6px 9px",
                                borderRadius: 8,
                                border: "1px solid #71717a",
                                background: "rgba(113,113,122,0.12)",
                                color: "#e4e4e7",
                                fontWeight: 700,
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Excluir horário
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}

                    {slotsVisiveis.length === 0 ? (
                      <div style={{ color: "#a1a1aa" }}>
                        Nenhum horário futuro visível nesta abertura.
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {windowsFiltradas.length === 0 ? (
              <div style={{ color: "#a1a1aa" }}>
                Nenhuma abertura encontrada para este filtro.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}