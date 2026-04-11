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

type ClientRow = {
  id: string;
  name: string;
  document: string;
};

type AppointmentRow = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  source: string;
  notes?: string | null;
  client: {
    id: string;
    name: string;
    document: string;
  };
  createdByUser: {
    id: string;
    name: string;
    role: string;
  };
};

export default function AppointmentsPage() {
  const [me, setMe] = useState<MeState | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [notes, setNotes] = useState("");

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [meRes, clientsRes, appointmentsRes] = await Promise.all([
        fetch("/api/me").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/clients").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/appointments").then((r) => r.json()).catch(() => null),
      ]);

      if (meRes?.ok) {
        setMe(meRes);
      }

      if (clientsRes?.ok) {
        setClients(clientsRes.clients || []);
      }

      if (appointmentsRes?.ok) {
        setAppointments(appointmentsRes.appointments || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await load();
    };
    void run();
  }, [load]);

  async function createAppointment(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    const res = await fetch("/api/admin/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientId,
        scheduledAt,
        durationMinutes: Number(durationMinutes || 60),
        notes,
      }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao criar agendamento.");
      return;
    }

    setClientId("");
    setScheduledAt("");
    setDurationMinutes("60");
    setNotes("");
    setMsg("Agendamento criado com sucesso.");
    await load();
  }

  function abrirModalCancelamento(id: string) {
    setCancelTargetId(id);
    setCancelReason("");
    setCancelModalOpen(true);
  }

  function fecharModalCancelamento() {
    if (cancelSubmitting) return;
    setCancelModalOpen(false);
    setCancelTargetId(null);
    setCancelReason("");
  }

  async function confirmarCancelamento() {
    setMsg(null);

    const reason = cancelReason.trim();

    if (!cancelTargetId) {
      setMsg("Agendamento inválido.");
      return;
    }

    if (!reason) {
      setMsg("O cancelamento exige um motivo.");
      return;
    }

    setCancelSubmitting(true);

    const res = await fetch(`/api/admin/appointments/${cancelTargetId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "CANCELADO", reason }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    setCancelSubmitting(false);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao cancelar agendamento.");
      return;
    }

    setMsg("Agendamento cancelado com sucesso.");
    fecharModalCancelamento();
    await load();
  }

  async function atualizarStatus(id: string, status: string) {
    setMsg(null);

    if (status === "CANCELADO") {
      abrirModalCancelamento(id);
      return;
    }

    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao atualizar status.");
      return;
    }

    setMsg("Status atualizado com sucesso.");
    await load();
  }

  async function excluirFinalizado(id: string) {
    setMsg(null);

    const res = await fetch(`/api/admin/appointments/finished/${id}`, {
      method: "DELETE",
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao excluir agendamento.");
      return;
    }

    setMsg("Agendamento excluído com sucesso.");
    await load();
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  }

  function corStatus(status: string) {
    if (status === "AGENDADO") return "#eab308";
    if (status === "CONFIRMADO") return "#22c55e";
    if (status === "CANCELADO") return "#ef4444";
    if (status === "CONCLUIDO") return "#3b82f6";
    return "#a1a1aa";
  }

  const agendadosFuturos = useMemo(
    () => appointments.filter((a) => a.status === "AGENDADO" || a.status === "CONFIRMADO"),
    [appointments]
  );

  const concluidos = useMemo(
    () => appointments.filter((a) => a.status === "CONCLUIDO"),
    [appointments]
  );

  const cancelados = useMemo(
    () => appointments.filter((a) => a.status === "CANCELADO"),
    [appointments]
  );

  function renderCard(a: AppointmentRow, permitirExcluir: boolean) {
    return (
      <div
        key={a.id}
        style={{
          border: "1px solid #27272a",
          borderRadius: 16,
          padding: 16,
          background: "rgba(9,9,11,0.6)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18 }}>{a.client.name}</div>
        <div style={{ color: "#a1a1aa", marginTop: 4 }}>{a.client.document}</div>
        <div style={{ marginTop: 8 }}>{formatDate(a.scheduledAt)}</div>

        <div
          style={{
            marginTop: 6,
            color: corStatus(a.status),
            fontWeight: 900,
          }}
        >
          {a.status}
        </div>

        <div style={{ marginTop: 4 }}>
          {a.durationMinutes} min · {a.source}
        </div>

        <div style={{ marginTop: 4, color: "#d4d4d8" }}>
          Criado por: {a.createdByUser.name}
        </div>

        {a.notes ? (
          <div style={{ marginTop: 8, color: "#e4e4e7" }}>{a.notes}</div>
        ) : null}

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {!permitirExcluir ? (
            <>
              <button
                type="button"
                onClick={() => atualizarStatus(a.id, "CONFIRMADO")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: "1px solid #22c55e",
                  background: "rgba(34,197,94,0.15)",
                  color: "#22c55e",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Confirmar
              </button>

              <button
                type="button"
                onClick={() => atualizarStatus(a.id, "CANCELADO")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: "1px solid #ef4444",
                  background: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => atualizarStatus(a.id, "CONCLUIDO")}
                style={{
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: "1px solid #3b82f6",
                  background: "rgba(59,130,246,0.15)",
                  color: "#3b82f6",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Concluir
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => excluirFinalizado(a.id)}
              style={{
                padding: "8px 10px",
                borderRadius: 9,
                border: "1px solid #71717a",
                background: "rgba(113,113,122,0.14)",
                color: "#e4e4e7",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Excluir da lista
            </button>
          )}
        </div>
      </div>
    );
  }

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
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Agendamentos</h1>
          <p style={{ marginTop: 8, color: "#d4d4d8" }}>
            Crie, acompanhe e organize os agendamentos da advocacia.
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
          <h2 style={{ marginTop: 0 }}>Novo agendamento</h2>

          <form onSubmit={createAppointment} style={{ display: "grid", gap: 12 }}>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid #3f3f46",
                background: "#09090b",
                color: "white",
                colorScheme: "dark",
              }}
            >
              <option value="">Selecione o cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.document}
                </option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
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
              min="15"
              max="480"
              step="15"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="Duração em minutos"
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
              rows={4}
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
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #4f46e5",
                background: "#4f46e5",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Criar agendamento
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
          <h2 style={{ marginTop: 0 }}>Próximos agendamentos</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {agendadosFuturos.length > 0 ? (
              agendadosFuturos.map((a) => renderCard(a, false))
            ) : (
              <div style={{ color: "#a1a1aa" }}>Nenhum agendamento futuro.</div>
            )}
          </div>
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
          <h2 style={{ marginTop: 0 }}>Agendamentos concluídos</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {concluidos.length > 0 ? (
              concluidos.map((a) => renderCard(a, true))
            ) : (
              <div style={{ color: "#a1a1aa" }}>Nenhum agendamento concluído.</div>
            )}
          </div>
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
          <h2 style={{ marginTop: 0 }}>Agendamentos cancelados</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {cancelados.length > 0 ? (
              cancelados.map((a) => renderCard(a, true))
            ) : (
              <div style={{ color: "#a1a1aa" }}>Nenhum agendamento cancelado.</div>
            )}
          </div>
        </section>
      </div>

      {cancelModalOpen ? (
        <div
          onClick={fecharModalCancelamento}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(10px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 24,
              padding: 24,
              background:
                "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.94))",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                marginBottom: 8,
              }}
            >
              Cancelar agendamento
            </div>

            <div
              style={{
                color: "#94a3b8",
                fontSize: 14,
                lineHeight: 1.7,
                marginBottom: 16,
              }}
            >
              Informe o motivo do cancelamento. Esse motivo será salvo e enviado por e-mail.
            </div>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Digite o motivo do cancelamento..."
              rows={5}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                color: "#F8FAFC",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 18,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={fecharModalCancelamento}
                disabled={cancelSubmitting}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#E4E4E7",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={confirmarCancelamento}
                disabled={cancelSubmitting}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #ef4444",
                  background: "linear-gradient(135deg, rgba(239,68,68,0.92), rgba(185,28,28,0.92))",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 12px 26px rgba(239,68,68,0.22)",
                }}
              >
                {cancelSubmitting ? "Cancelando..." : "Confirmar cancelamento"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}