"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaCircleCheck,
  FaClock,
  FaFileExport,
  FaFolderOpen,
  FaGavel,
  FaPlus,
  FaRotateLeft,
  FaTrash,
  FaUserGroup,
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

type ClientRow = {
  id: string;
  name: string;
  document: string;
};

type ProcessRow = {
  id: string;
  cnj?: string;
  tribunal?: string | null;
  vara?: string | null;
  archived?: boolean;
  client?: {
    id: string;
    name: string;
    document: string;
  };
};

type AppointmentRow = {
  id: string;
  title?: string | null;
  appointmentType?: "CLIENT" | "AUDIENCIA" | string;
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
  process?: ProcessRow | null;
  createdByUser: {
    id: string;
    name: string;
    role: string;
  };
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type FormState = {
  appointmentType: "CLIENT" | "AUDIENCIA";
  title: string;
  clientId: string;
  processId: string;
  scheduledAt: string;
  durationMinutes: string;
  notes: string;
};

const emptyForm: FormState = {
  appointmentType: "CLIENT",
  title: "",
  clientId: "",
  processId: "",
  scheduledAt: "",
  durationMinutes: "60",
  notes: "",
};

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function normalizeText(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatCnj(value?: string) {
  const digits = onlyDigits(value || "").slice(0, 20);

  return digits
    .replace(/^(\d{7})(\d)/, "$1-$2")
    .replace(/^(\d{7})-(\d{2})(\d)/, "$1-$2.$3")
    .replace(/^(\d{7})-(\d{2})\.(\d{4})(\d)/, "$1-$2.$3.$4")
    .replace(/^(\d{7})-(\d{2})\.(\d{4})\.(\d)(\d)/, "$1-$2.$3.$4.$5")
    .replace(/^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})(\d)/, "$1-$2.$3.$4.$5.$6");
}

function isAudience(item: AppointmentRow) {
  return item.appointmentType === "AUDIENCIA";
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    AGENDADO: "Agendado",
    CONFIRMADO: "Confirmado",
    CANCELADO: "Cancelado",
    CONCLUIDO: "Concluído",
  };

  return map[status] || status;
}

function statusClass(status: string) {
  if (status === "CONFIRMADO") return "jv-pill-green";
  if (status === "CANCELADO") return "jv-pill-red";
  if (status === "CONCLUIDO") return "jv-pill-blue";
  return "jv-pill-yellow";
}

function isActiveAppointment(item: AppointmentRow) {
  return item.status === "AGENDADO" || item.status === "CONFIRMADO";
}

function normalizeProcessLabel(process: ProcessRow) {
  const cnj = formatCnj(process.cnj || "") || "Sem número";
  const client = process.client?.name || "Cliente não informado";
  return `${client} — ${cnj}`;
}

export default function AppointmentsPage() {
  const [me, setMe] = useState<MeState | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [clientSearch, setClientSearch] = useState("");
  const [processSearch, setProcessSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  function showToast(message: string, type: ToastState["type"] = "info") {
    setToast({ open: true, message, type });
  }

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [meRes, clientsRes, processesRes, appointmentsRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/admin/clients", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/admin/processes?status=active", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/admin/appointments", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => null),
      ]);

      if (meRes?.ok) setMe(meRes);
      if (clientsRes?.ok) setClients(clientsRes.clients || []);
      if (processesRes?.ok) setProcesses(processesRes.processes || []);
      if (appointmentsRes?.ok) setAppointments(appointmentsRes.appointments || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredClients = useMemo(() => {
    const term = normalizeText(clientSearch);
    const digits = onlyDigits(clientSearch);

    if (!term && !digits) return clients;

    return clients.filter((client) => {
      const text = normalizeText(`${client.name} ${client.document}`);
      const doc = onlyDigits(client.document);

      return text.includes(term) || Boolean(digits && doc.includes(digits));
    });
  }, [clientSearch, clients]);

  const filteredProcesses = useMemo(() => {
    const term = normalizeText(processSearch);
    const digits = onlyDigits(processSearch);

    const activeProcesses = processes.filter((process) => !process.archived);

    if (!term && !digits) return activeProcesses;

    return activeProcesses.filter((process) => {
      const text = normalizeText(
        `${process.client?.name || ""} ${process.client?.document || ""} ${process.cnj || ""} ${process.tribunal || ""} ${process.vara || ""}`
      );

      const doc = onlyDigits(`${process.client?.document || ""} ${process.cnj || ""}`);

      return text.includes(term) || Boolean(digits && doc.includes(digits));
    });
  }, [processSearch, processes]);

  const clientAppointments = useMemo(
    () => appointments.filter((item) => !isAudience(item)),
    [appointments]
  );

  const audienceAppointments = useMemo(
    () => appointments.filter((item) => isAudience(item)),
    [appointments]
  );

  const upcomingClientAppointments = useMemo(
    () => clientAppointments.filter(isActiveAppointment),
    [clientAppointments]
  );

  const upcomingAudiences = useMemo(
    () => audienceAppointments.filter(isActiveAppointment),
    [audienceAppointments]
  );

  const finishedClientAppointments = useMemo(
    () => clientAppointments.filter((item) => item.status === "CONCLUIDO"),
    [clientAppointments]
  );

  const cancelledClientAppointments = useMemo(
    () => clientAppointments.filter((item) => item.status === "CANCELADO"),
    [clientAppointments]
  );

  const stats = useMemo(() => {
    return {
      clients: upcomingClientAppointments.length,
      audiences: upcomingAudiences.length,
      finished: finishedClientAppointments.length,
      cancelled: cancelledClientAppointments.length,
    };
  }, [cancelledClientAppointments.length, finishedClientAppointments.length, upcomingAudiences.length, upcomingClientAppointments.length]);

  function openCreateModal(type: "CLIENT" | "AUDIENCIA") {
    setForm({
      ...emptyForm,
      appointmentType: type,
      title: type === "AUDIENCIA" ? "Audiência" : "Atendimento",
    });
    setClientSearch("");
    setProcessSearch("");
    setModalOpen(true);
  }

  async function createAppointment() {
    if (form.appointmentType === "CLIENT" && !form.clientId) {
      showToast("Selecione o cliente.", "warning");
      return;
    }

    if (form.appointmentType === "AUDIENCIA" && !form.processId) {
      showToast("Selecione o processo da audiência.", "warning");
      return;
    }

    if (!form.scheduledAt) {
      showToast("Informe data e hora.", "warning");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/admin/appointments", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        appointmentType: form.appointmentType,
        title: form.title,
        clientId: form.clientId,
        processId: form.processId,
        scheduledAt: form.scheduledAt,
        durationMinutes: Number(form.durationMinutes || 60),
        notes: form.notes,
      }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .catch(() => null);

    setSaving(false);

    if (!res || !res.ok || !res.d.ok) {
      showToast(res?.d?.message || "Erro ao criar.", "error");
      return;
    }

    setModalOpen(false);
    setForm(emptyForm);
    showToast(res.d.message || "Registro criado com sucesso.", "success");
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
    const reason = cancelReason.trim();

    if (!cancelTargetId) {
      showToast("Registro inválido.", "error");
      return;
    }

    if (!reason) {
      showToast("O cancelamento exige um motivo.", "warning");
      return;
    }

    setCancelSubmitting(true);

    const res = await fetch(`/api/admin/appointments/${cancelTargetId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "CANCELADO", reason }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({ })) }))
      .catch(() => null);

    setCancelSubmitting(false);

    if (!res || !res.ok || !res.d.ok) {
      showToast(res?.d?.message || "Erro ao cancelar.", "error");
      return;
    }

    showToast("Cancelado com sucesso.", "success");
    fecharModalCancelamento();
    await load();
  }

  async function atualizarStatus(id: string, status: string) {
    if (status === "CANCELADO") {
      abrirModalCancelamento(id);
      return;
    }

    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({ })) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      showToast(res?.d?.message || "Erro ao atualizar status.", "error");
      return;
    }

    showToast("Status atualizado com sucesso.", "success");
    await load();
  }

  async function excluirFinalizado(id: string) {
    const res = await fetch(`/api/admin/appointments/finished/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({ })) }))
      .catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      showToast(res?.d?.message || "Erro ao excluir.", "error");
      return;
    }

    showToast("Registro excluído com sucesso.", "success");
    await load();
  }

  function renderCard(item: AppointmentRow, permitirExcluir: boolean) {
    const audience = isAudience(item);

    return (
      <article className="jv-appointment-card" key={item.id}>
        <div>
          <div className="jv-card-title">
            {audience ? item.title || "Audiência" : item.client.name}
          </div>

          <div className="jv-card-meta">
            {audience
              ? `Processo: ${formatCnj(item.process?.cnj || "") || "Não vinculado"}`
              : item.client.document}
          </div>

          <div className="jv-card-muted">
            {audience ? `Cliente: ${item.client.name}` : `${item.durationMinutes} min · ${item.source}`}
          </div>

          <div className="jv-pills">
            <span className={`jv-pill ${statusClass(item.status)}`}>
              {getStatusLabel(item.status)}
            </span>

            <span className="jv-pill jv-pill-purple">
              {formatDate(item.scheduledAt)}
            </span>

            <span className="jv-pill jv-pill-blue">
              Criado por: {item.createdByUser.name}
            </span>
          </div>

          {item.notes ? <div className="jv-card-notes">{item.notes}</div> : null}
        </div>

        <div className="jv-actions">
          {!permitirExcluir ? (
            <>
              <button className="jv-secondary" onClick={() => atualizarStatus(item.id, "CONFIRMADO")}>
                Confirmar
              </button>

              <button className="jv-danger" onClick={() => atualizarStatus(item.id, "CANCELADO")}>
                Cancelar
              </button>

              <button className="jv-success" onClick={() => atualizarStatus(item.id, "CONCLUIDO")}>
                Concluir
              </button>
            </>
          ) : (
            <button className="jv-secondary" onClick={() => excluirFinalizado(item.id)}>
              <FaTrash />
              Excluir da lista
            </button>
          )}
        </div>
      </article>
    );
  }

  if (loading && !me) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#fff" }}>
        Carregando agendamentos...
      </div>
    );
  }

  if (!me) {
    return <div>Não foi possível carregar a sessão.</div>;
  }

  return (
    <AdminShell userName={me.user.name} role={me.user.role} firmName={me.firm?.name || "Advocacia"}>
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PremiumModal
        open={modalOpen}
        onClose={() => {
          if (!saving) setModalOpen(false);
        }}
        title={form.appointmentType === "AUDIENCIA" ? "Nova audiência" : "Novo agendamento"}
        description={
          form.appointmentType === "AUDIENCIA"
            ? "Cadastre uma audiência vinculada a um processo."
            : "Cadastre um atendimento vinculado a um cliente."
        }
        footer={
          <>
            <button className="jv-premium-btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </button>

            <button className="jv-premium-btn" onClick={createAppointment} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </>
        }
      >
        <div className="jv-appointment-form">
          {form.appointmentType === "CLIENT" ? (
            <>
              <input
                className="jv-premium-input"
                placeholder="Buscar cliente por nome ou CPF/CNPJ"
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
              />

              <select
                className="jv-premium-input jv-dark-select"
                value={form.clientId}
                onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
              >
                <option value="">Selecione o cliente</option>
                {filteredClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.document}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <input
                className="jv-premium-input"
                placeholder="Buscar processo por cliente, CPF/CNPJ ou CNJ"
                value={processSearch}
                onChange={(event) => setProcessSearch(event.target.value)}
              />

              <select
                className="jv-premium-input jv-dark-select"
                value={form.processId}
                onChange={(event) => setForm((prev) => ({ ...prev, processId: event.target.value }))}
              >
                <option value="">Selecione o processo</option>
                {filteredProcesses.map((process) => (
                  <option key={process.id} value={process.id}>
                    {normalizeProcessLabel(process)}
                  </option>
                ))}
              </select>
            </>
          )}

          <input
            className="jv-premium-input"
            placeholder="Título"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />

          <input
            className="jv-premium-input"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
          />

          <input
            className="jv-premium-input"
            type="number"
            min="15"
            max="480"
            step="15"
            value={form.durationMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
            placeholder="Duração em minutos"
          />

          <textarea
            className="jv-premium-input"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Observações"
          />
        </div>
      </PremiumModal>

      <PremiumModal
        open={cancelModalOpen}
        onClose={fecharModalCancelamento}
        title="Cancelar agendamento"
        description="Informe o motivo do cancelamento."
        footer={
          <>
            <button className="jv-premium-btn-secondary" onClick={fecharModalCancelamento} disabled={cancelSubmitting}>
              Voltar
            </button>

            <button
              className="jv-premium-btn"
              onClick={confirmarCancelamento}
              disabled={cancelSubmitting}
              style={{ background: "linear-gradient(135deg, #ef4444, #7f1d1d)" }}
            >
              {cancelSubmitting ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
          </>
        }
      >
        <textarea
          className="jv-premium-input"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="Digite o motivo do cancelamento..."
          rows={5}
        />
      </PremiumModal>

      <div className="jv-appointments-page">
        <style>{`
          .jv-appointments-page {
            display: grid;
            gap: 20px;
          }

          .jv-appointments-page * {
            box-sizing: border-box;
          }

          .jv-appointment-form {
            display: grid;
            gap: 12px;
          }

          .jv-appointment-form textarea {
            min-height: 120px;
            resize: vertical;
          }

          .jv-dark-select,
          .jv-dark-select option,
          .jv-appointment-form select,
          .jv-appointment-form select option {
            background-color: #111827 !important;
            color: #f8fafc !important;
            color-scheme: dark;
          }

          .jv-hero {
            min-height: 230px;
            position: relative;
            overflow: hidden;
            border-radius: 28px;
            border: 1px solid rgba(168,85,247,0.22);
            background:
              linear-gradient(90deg, rgba(7, 10, 23, 0.96), rgba(12, 15, 31, 0.84), rgba(17, 24, 39, 0.72)),
              radial-gradient(circle at 82% 17%, rgba(124,58,237,0.34), transparent 32%),
              linear-gradient(135deg, #090b16, #111827);
            box-shadow:
              0 34px 90px rgba(0,0,0,0.36),
              inset 0 1px 0 rgba(255,255,255,0.045);
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
            max-width: 850px;
          }

          .jv-actions-top {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
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

          .jv-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .jv-stat-card {
            min-height: 132px;
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

          .jv-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(380px, 0.7fr);
            gap: 16px;
            align-items: start;
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

          .jv-list {
            display: grid;
            gap: 13px;
          }

          .jv-appointment-card {
            display: grid;
            grid-template-columns: minmax(260px, 1fr) auto;
            gap: 18px;
            align-items: center;
            padding: 18px;
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.13);
            background: rgba(255,255,255,0.035);
          }

          .jv-card-title {
            color: #f8fafc;
            font-size: 19px;
            font-weight: 950;
          }

          .jv-card-meta {
            margin-top: 8px;
            color: #cbd5e1;
            font-size: 14px;
          }

          .jv-card-muted,
          .jv-card-notes {
            margin-top: 7px;
            color: #94a3b8;
            font-size: 13px;
            line-height: 1.6;
          }

          .jv-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
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

          .jv-pill-yellow {
            color: #fde68a;
            background: rgba(202,138,4,0.14);
            border: 1px solid rgba(245,158,11,0.24);
          }

          .jv-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 9px;
            justify-content: flex-end;
          }

          .jv-empty {
            padding: 20px;
            border-radius: 18px;
            background: rgba(255,255,255,0.035);
            border: 1px dashed rgba(148,163,184,0.22);
            color: #94a3b8;
            text-align: center;
          }

          @media (max-width: 1200px) {
            .jv-stats-grid,
            .jv-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .jv-hero {
              padding: 28px 22px;
              min-height: auto;
            }

            .jv-actions-top,
            .jv-actions {
              display: grid;
              width: 100%;
            }

            .jv-primary,
            .jv-secondary,
            .jv-danger,
            .jv-success {
              width: 100%;
            }

            .jv-appointment-card {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <section className="jv-hero">
          <div className="jv-hero-content">
            <div>
              <div className="jv-kicker">Agenda do escritório</div>

              <h1 className="jv-title">Agendamentos</h1>

              <p className="jv-subtitle">
                Organize atendimentos de clientes e audiências em fluxos separados,
                mantendo exportação dos agendamentos e painel de audiências no Dashboard.
              </p>
            </div>

            <div className="jv-actions-top">
              <button className="jv-primary" onClick={() => openCreateModal("CLIENT")}>
                <FaPlus />
                Novo agendamento
              </button>

              <button className="jv-primary" onClick={() => openCreateModal("AUDIENCIA")}>
                <FaGavel />
                Nova audiência
              </button>
            </div>
          </div>
        </section>

        <section className="jv-stats-grid">
          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaUserGroup /></div>
            <div>
              <div className="jv-stat-title">Agendamentos ativos</div>
              <div className="jv-stat-value">{stats.clients}</div>
              <div className="jv-stat-subtitle">Atendimentos de clientes</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaGavel /></div>
            <div>
              <div className="jv-stat-title">Audiências ativas</div>
              <div className="jv-stat-value">{stats.audiences}</div>
              <div className="jv-stat-subtitle">Vinculadas a processos</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaCircleCheck /></div>
            <div>
              <div className="jv-stat-title">Concluídos</div>
              <div className="jv-stat-value">{stats.finished}</div>
              <div className="jv-stat-subtitle">Atendimentos finalizados</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaXmark /></div>
            <div>
              <div className="jv-stat-title">Cancelados</div>
              <div className="jv-stat-value">{stats.cancelled}</div>
              <div className="jv-stat-subtitle">Atendimentos cancelados</div>
            </div>
          </article>
        </section>

        <section className="jv-grid">
          <div className="jv-panel">
            <div className="jv-panel-title">Agendamentos de clientes</div>

            <div className="jv-actions-top" style={{ marginBottom: 14 }}>
              <button className="jv-secondary" onClick={() => window.open("/api/admin/appointments/export?format=csv", "_blank")}>
                <FaFileExport />
                Exportar CSV
              </button>

              <button className="jv-secondary" onClick={() => window.open("/api/admin/appointments/export?format=xlsx", "_blank")}>
                <FaFileExport />
                Exportar Excel
              </button>
            </div>

            <div className="jv-list">
              {upcomingClientAppointments.length > 0 ? (
                upcomingClientAppointments.map((item) => renderCard(item, false))
              ) : (
                <div className="jv-empty">Nenhum agendamento futuro.</div>
              )}
            </div>
          </div>

          <div className="jv-panel">
            <div className="jv-panel-title">Audiências</div>

            <div className="jv-list">
              {upcomingAudiences.length > 0 ? (
                upcomingAudiences.map((item) => renderCard(item, false))
              ) : (
                <div className="jv-empty">Nenhuma audiência futura.</div>
              )}
            </div>
          </div>
        </section>

        <section className="jv-grid">
          <div className="jv-panel">
            <div className="jv-panel-title">Agendamentos concluídos</div>

            <div className="jv-list">
              {finishedClientAppointments.length > 0 ? (
                finishedClientAppointments.map((item) => renderCard(item, true))
              ) : (
                <div className="jv-empty">Nenhum agendamento concluído.</div>
              )}
            </div>
          </div>

          <div className="jv-panel">
            <div className="jv-panel-title">Agendamentos cancelados</div>

            <div className="jv-list">
              {cancelledClientAppointments.length > 0 ? (
                cancelledClientAppointments.map((item) => renderCard(item, true))
              ) : (
                <div className="jv-empty">Nenhum agendamento cancelado.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}