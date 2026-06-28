"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaClock,
  FaCircleCheck,
  FaMagnifyingGlass,
  FaPenToSquare,
  FaPlus,
  FaRotateLeft,
  FaTrash,
  FaTriangleExclamation,
  FaXmark,
} from "react-icons/fa6";
import AdminShell from "@/components/AdminShell";
import PremiumModal from "@/components/PremiumModal";
import PremiumToast from "@/components/PremiumToast";

type MeResponse = {
  ok?: boolean;
  user?: {
    name?: string;
    role?: string;
  };
};

type Me = {
  name: string;
  role: string;
};

type Client = {
  name?: string;
  document?: string;
};

type ProcessRef = {
  id: string;
  title?: string;
  cnj?: string;
  number?: string;
  processNumber?: string;
  archived?: boolean;
  client?: {
    name?: string;
    document?: string;
  };
};

type DeadlineRow = {
  id: string;
  title?: string;
  description?: string | null;
  dueDate?: string;
  done?: boolean;
  createdAt?: string;
  client?: Client;
  process?: ProcessRef;
  processId?: string;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type FormState = {
  processId: string;
  title: string;
  description: string;
  dueAt: string;
};

type FilterMode = "pending" | "done" | "late" | "all";

type DeleteAction = {
  deadline: DeadlineRow;
} | null;

const emptyForm: FormState = {
  processId: "",
  title: "",
  description: "",
  dueAt: "",
};

function normalizeMe(data: MeResponse): Me | null {
  if (!data?.ok || !data?.user) return null;

  return {
    name: data.user.name ?? "Usuário",
    role: data.user.role ?? "SECRETARY",
  };
}

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function normalizeText(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

function formatDate(date?: string) {
  if (!date) return "Sem data";

  try {
    return new Date(date).toLocaleDateString("pt-BR");
  } catch {
    return date;
  }
}

function toInputDateTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getProcessNumber(process?: ProcessRef) {
  if (!process) return "Sem processo";
  return formatCnj(process.cnj || process.number || process.processNumber || "") || "Sem número";
}

function getProcessLabel(process: ProcessRef) {
  const number = getProcessNumber(process);
  const clientName = process.client?.name?.trim();
  const title = process.title?.trim();

  if (clientName && title) return `${clientName} — ${number} — ${title}`;
  if (clientName) return `${clientName} — ${number}`;
  if (title) return `${number} — ${title}`;

  return number;
}

function isLate(dueDate?: string) {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
}

function StatCard({
  title,
  value,
  subtitle,
  Icon,
  tone = "purple",
}: {
  title: string;
  value: number;
  subtitle: string;
  Icon: React.ComponentType;
  tone?: "purple" | "green" | "red" | "yellow";
}) {
  return (
    <article className={`jv-deadline-stat jv-deadline-stat-${tone}`}>
      <div className="jv-deadline-stat-icon">
        <Icon />
      </div>

      <div>
        <div className="jv-deadline-stat-title">{title}</div>
        <div className="jv-deadline-stat-value">{value}</div>
        <div className="jv-deadline-stat-subtitle">{subtitle}</div>
      </div>
    </article>
  );
}

export default function DeadlinesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineRow[]>([]);
  const [processes, setProcesses] = useState<ProcessRef[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [processSearch, setProcessSearch] = useState("");
  const [savingForm, setSavingForm] = useState(false);

  const [filterMode, setFilterMode] = useState<FilterMode>("pending");
  const [search, setSearch] = useState("");

  const [deleteAction, setDeleteAction] = useState<DeleteAction>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const stats = useMemo(() => {
    const pending = deadlines.filter((d) => !d.done);
    const done = deadlines.filter((d) => d.done);
    const late = pending.filter((d) => isLate(d.dueDate));

    return {
      total: deadlines.length,
      pending: pending.length,
      done: done.length,
      late: late.length,
    };
  }, [deadlines]);

  const filteredProcessesForSelect = useMemo(() => {
    const term = normalizeText(processSearch);
    const digits = onlyDigits(processSearch);

    const activeProcesses = processes.filter((process) => !process.archived);

    if (!term && !digits) return activeProcesses;

    return activeProcesses.filter((process) => {
      const fullText = normalizeText(
        [
          process.client?.name,
          process.client?.document,
          process.title,
          process.cnj,
          process.number,
          process.processNumber,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const digitText = onlyDigits(
        [
          process.client?.document,
          process.cnj,
          process.number,
          process.processNumber,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return fullText.includes(term) || Boolean(digits && digitText.includes(digits));
    });
  }, [processSearch, processes]);

  const visibleDeadlines = useMemo(() => {
    const term = normalizeText(search);
    const digits = onlyDigits(search);

    return deadlines.filter((deadline) => {
      const late = !deadline.done && isLate(deadline.dueDate);

      if (filterMode === "pending" && deadline.done) return false;
      if (filterMode === "done" && !deadline.done) return false;
      if (filterMode === "late" && !late) return false;

      if (!term && !digits) return true;

      const fullText = normalizeText(
        [
          deadline.title,
          deadline.description || "",
          deadline.process?.client?.name,
          deadline.process?.client?.document,
          deadline.process?.cnj,
          deadline.process?.number,
          deadline.process?.processNumber,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const digitText = onlyDigits(
        [
          deadline.process?.client?.document,
          deadline.process?.cnj,
          deadline.process?.number,
          deadline.process?.processNumber,
        ]
          .filter(Boolean)
          .join(" ")
      );

      return fullText.includes(term) || Boolean(digits && digitText.includes(digits));
    });
  }, [deadlines, filterMode, search]);

  function showToast(message: string, type: ToastState["type"]) {
    setToast({ open: true, message, type });
  }

  async function load() {
    setLoading(true);

    const meResponse = await fetch("/api/me", {
      cache: "no-store",
      credentials: "include",
    })
      .then((response) => response.json())
      .catch(() => null);

    const normalizedMe = normalizeMe(meResponse);

    if (!normalizedMe) {
      setLoading(false);
      window.location.href = "/login";
      return;
    }

    setMe(normalizedMe);

    const [deadlinesResponse, processesResponse] = await Promise.all([
      fetch("/api/admin/deadlines?status=all", {
        cache: "no-store",
        credentials: "include",
      })
        .then((response) => response.json())
        .catch(() => null),
      fetch("/api/admin/processes?status=all", {
        cache: "no-store",
        credentials: "include",
      })
        .then((response) => response.json())
        .catch(() => null),
    ]);

    const deadlinesList =
      Array.isArray(deadlinesResponse?.deadlines)
        ? deadlinesResponse.deadlines
        : Array.isArray(deadlinesResponse)
          ? deadlinesResponse
          : [];

    const processesList =
      Array.isArray(processesResponse?.processes)
        ? processesResponse.processes
        : Array.isArray(processesResponse)
          ? processesResponse
          : [];

    setDeadlines(deadlinesList);
    setProcesses(processesList);
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!ignore) {
        await load();
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, []);

  function openCreateModal() {
    setModalMode("create");
    setEditingDeadlineId(null);
    setForm(emptyForm);
    setProcessSearch("");
    setModalOpen(true);
  }

  function openEditModal(deadline: DeadlineRow) {
    setModalMode("edit");
    setEditingDeadlineId(deadline.id);
    setForm({
      processId: deadline.process?.id || deadline.processId || "",
      title: deadline.title || "",
      description: deadline.description || "",
      dueAt: toInputDateTime(deadline.dueDate),
    });
    setProcessSearch(deadline.process?.client?.name || getProcessNumber(deadline.process));
    setModalOpen(true);
  }

  async function submitForm() {
    const processId = form.processId.trim();
    const title = form.title.trim();
    const description = form.description.trim();
    const dueAt = form.dueAt;

    if (!processId) {
      showToast("Selecione o processo.", "warning");
      return;
    }

    if (!title) {
      showToast("Preencha o título do prazo.", "warning");
      return;
    }

    if (!dueAt) {
      showToast("Preencha a data do prazo.", "warning");
      return;
    }

    setSavingForm(true);

    try {
      const payload = {
        processId,
        title,
        description,
        dueDate: dueAt,
        dueAt,
        date: dueAt,
        deadlineAt: dueAt,
      };

      const endpoint =
        modalMode === "create"
          ? "/api/admin/deadlines"
          : `/api/admin/deadlines/${editingDeadlineId}`;

      const response = await fetch(endpoint, {
        method: modalMode === "create" ? "POST" : "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao salvar prazo.", "error");
        return;
      }

      setModalOpen(false);
      setEditingDeadlineId(null);
      setForm(emptyForm);
      await load();
      showToast(
        modalMode === "create"
          ? "Prazo criado com sucesso."
          : "Prazo atualizado com sucesso.",
        "success"
      );
    } catch {
      showToast("Não foi possível salvar o prazo.", "error");
    } finally {
      setSavingForm(false);
    }
  }

  async function markDone(deadline: DeadlineRow, done = true) {
    try {
      const response = await fetch("/api/admin/deadlines/done", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: deadline.id, done }),
      }).then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao atualizar prazo.", "error");
        return;
      }

      setDeadlines((prev) =>
        prev.map((item) => (item.id === deadline.id ? { ...item, done } : item))
      );

      await load();
      showToast(done ? "Prazo marcado como concluído." : "Prazo reaberto.", "success");
    } catch {
      showToast("Não foi possível atualizar o prazo.", "error");
    }
  }

  async function confirmDelete() {
    if (!deleteAction) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/admin/deadlines/${deleteAction.deadline.id}`, {
        method: "DELETE",
        credentials: "include",
      }).then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao excluir prazo.", "error");
        return;
      }

      setDeleteAction(null);
      await load();
      showToast("Prazo excluído com sucesso.", "success");
    } catch {
      showToast("Não foi possível excluir o prazo.", "error");
    } finally {
      setDeleting(false);
    }
  }

  if (!me && loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
          color: "#E2E8F0",
          padding: 24,
          textAlign: "center",
        }}
      >
        Carregando prazos...
      </div>
    );
  }

  return (
    <AdminShell role={me?.role ?? "SECRETARY"} userName={me?.name ?? "Usuário"}>
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PremiumModal
        open={modalOpen}
        onClose={() => {
          if (!savingForm) setModalOpen(false);
        }}
        title={modalMode === "create" ? "Novo prazo" : "Editar prazo"}
        description="Cadastre o prazo vinculado a um processo real do escritório."
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setModalOpen(false)}
              disabled={savingForm}
            >
              Cancelar
            </button>

            <button
              className="jv-premium-btn"
              onClick={submitForm}
              disabled={savingForm}
            >
              {savingForm ? "Salvando..." : "Salvar prazo"}
            </button>
          </>
        }
      >
        <div className="jv-deadline-form">
          <div className="jv-form-field">
            <label>Buscar processo</label>
            <input
              className="jv-premium-input jv-dark-input"
              placeholder="Digite nome do cliente, CPF/CNPJ ou número do processo"
              value={processSearch}
              onChange={(event) => setProcessSearch(event.target.value)}
            />
          </div>

          <div className="jv-form-field">
            <label>Processo</label>
            <select
              className="jv-premium-input jv-dark-select"
              value={form.processId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, processId: event.target.value }))
              }
            >
              <option value="">Selecione o processo</option>
              {filteredProcessesForSelect.map((process) => (
                <option key={process.id} value={process.id}>
                  {getProcessLabel(process)}
                </option>
              ))}
            </select>
          </div>

          <div className="jv-form-field">
            <label>Título do prazo</label>
            <input
              className="jv-premium-input jv-dark-input"
              placeholder="Ex.: Contestação, audiência, manifestação..."
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>

          <div className="jv-form-field">
            <label>Descrição</label>
            <textarea
              className="jv-premium-input jv-dark-input"
              placeholder="Descrição opcional do prazo"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>

          <div className="jv-form-field">
            <label>Data e hora do prazo</label>
            <input
              className="jv-premium-input jv-dark-input"
              type="datetime-local"
              value={form.dueAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dueAt: event.target.value }))
              }
            />
          </div>
        </div>
      </PremiumModal>

      <PremiumModal
        open={!!deleteAction}
        onClose={() => {
          if (!deleting) setDeleteAction(null);
        }}
        title="Excluir prazo"
        description="Confirme se deseja remover este prazo do processo."
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setDeleteAction(null)}
              disabled={deleting}
            >
              Cancelar
            </button>

            <button
              className="jv-premium-btn"
              onClick={confirmDelete}
              disabled={deleting}
              style={{
                background: "linear-gradient(135deg, #ef4444, #7f1d1d)",
                boxShadow: "0 18px 40px rgba(239,68,68,0.22)",
              }}
            >
              {deleting ? "Excluindo..." : "Excluir prazo"}
            </button>
          </>
        }
        size="sm"
      >
        <div className="jv-delete-box">
          <div className="jv-delete-icon">
            <FaTrash />
          </div>

          <div>
            <strong>{deleteAction?.deadline.title || "Prazo"}</strong>
            <span>
              Esta ação remove o prazo da lista e do dashboard.
            </span>
          </div>
        </div>
      </PremiumModal>

      <div className="jv-deadlines-page">
        <style>{`
          .jv-deadlines-page {
            display: grid;
            gap: 20px;
          }

          .jv-deadlines-page * {
            box-sizing: border-box;
          }

          .jv-deadline-form {
            display: grid;
            gap: 12px;
          }

          .jv-form-field {
            display: grid;
            gap: 7px;
          }

          .jv-form-field label {
            color: #cbd5e1;
            font-size: 13px;
            font-weight: 900;
          }

          .jv-dark-input,
          .jv-dark-select,
          .jv-deadline-form select,
          .jv-deadline-form select option {
            background-color: #111827 !important;
            color: #f8fafc !important;
            color-scheme: dark;
          }

          .jv-dark-input:focus,
          .jv-dark-select:focus {
            border-color: rgba(168,85,247,0.58);
            box-shadow: 0 0 0 3px rgba(168,85,247,0.12);
            outline: none;
          }

          .jv-deadline-form textarea {
            min-height: 110px;
            resize: vertical;
          }

          .jv-deadline-hero {
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

          .jv-deadline-hero-content {
            position: relative;
            z-index: 2;
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
            max-width: 820px;
          }

          .jv-deadline-primary {
            min-height: 50px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            border: 0;
            border-radius: 15px;
            padding: 0 18px;
            color: #fff;
            cursor: pointer;
            font-weight: 950;
            background: linear-gradient(135deg, #a855f7, #4f46e5);
            box-shadow: 0 18px 40px rgba(79,70,229,0.22);
          }

          .jv-deadline-secondary,
          .jv-deadline-danger,
          .jv-deadline-success {
            min-height: 42px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 14px;
            padding: 0 14px;
            cursor: pointer;
            font-weight: 900;
            font-size: 13px;
          }

          .jv-deadline-secondary {
            color: #e5e7eb;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(148,163,184,0.15);
          }

          .jv-deadline-danger {
            color: #fecaca;
            background: rgba(127,29,29,0.18);
            border: 1px solid rgba(248,113,113,0.25);
          }

          .jv-deadline-success {
            color: #a7f3d0;
            background: rgba(6,78,59,0.18);
            border: 1px solid rgba(52,211,153,0.24);
          }

          .jv-stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .jv-deadline-stat {
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

          .jv-deadline-stat-icon {
            width: 58px;
            height: 58px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            font-size: 24px;
            color: #d8b4fe;
            background: radial-gradient(circle, rgba(168,85,247,0.40), rgba(15,23,42,0.70));
          }

          .jv-deadline-stat-green .jv-deadline-stat-icon {
            color: #86efac;
            background: radial-gradient(circle, rgba(34,197,94,0.32), rgba(15,23,42,0.70));
          }

          .jv-deadline-stat-red .jv-deadline-stat-icon {
            color: #fca5a5;
            background: radial-gradient(circle, rgba(239,68,68,0.32), rgba(15,23,42,0.70));
          }

          .jv-deadline-stat-yellow .jv-deadline-stat-icon {
            color: #facc15;
            background: radial-gradient(circle, rgba(202,138,4,0.32), rgba(15,23,42,0.70));
          }

          .jv-deadline-stat-title {
            color: #a1a1aa;
            font-size: 13px;
          }

          .jv-deadline-stat-value {
            margin-top: 6px;
            color: #f8fafc;
            font-size: 34px;
            font-weight: 950;
            line-height: 1;
          }

          .jv-deadline-stat-subtitle {
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

          .jv-panel-head {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            flex-wrap: wrap;
            margin-bottom: 16px;
          }

          .jv-panel-title {
            color: #f8fafc;
            font-size: 24px;
            font-weight: 950;
            letter-spacing: -0.045em;
          }

          .jv-panel-subtitle {
            margin-top: 5px;
            color: #a1a1aa;
            font-size: 14px;
            line-height: 1.6;
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
            gap: 12px;
            border-radius: 16px;
            border: 1px solid rgba(148,163,184,0.16);
            background: rgba(15,23,42,0.62);
            padding: 0 15px;
            color: #cbd5e1;
          }

          .jv-search-box input {
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #f8fafc;
            font-size: 14px;
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

          .jv-list {
            display: grid;
            gap: 13px;
          }

          .jv-deadline-card {
            display: grid;
            grid-template-columns: minmax(260px, 1fr) auto;
            gap: 18px;
            align-items: center;
            padding: 18px;
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.13);
            background: rgba(255,255,255,0.035);
          }

          .jv-deadline-card-late {
            background: rgba(127,29,29,0.10);
            border-color: rgba(248,113,113,0.24);
          }

          .jv-deadline-name {
            color: #f8fafc;
            font-size: 19px;
            font-weight: 950;
          }

          .jv-deadline-meta {
            margin-top: 8px;
            color: #cbd5e1;
            font-size: 14px;
          }

          .jv-deadline-muted {
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

          .jv-delete-box {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 14px;
            align-items: center;
            padding: 16px;
            border-radius: 18px;
            background:
              radial-gradient(circle at 0% 0%, rgba(239,68,68,0.16), transparent 36%),
              rgba(255,255,255,0.035);
            border: 1px solid rgba(248,113,113,0.22);
            color: #e2e8f0;
          }

          .jv-delete-icon {
            width: 54px;
            height: 54px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            color: #fecaca;
            background: rgba(127,29,29,0.28);
            border: 1px solid rgba(248,113,113,0.24);
            font-size: 22px;
          }

          .jv-delete-box strong {
            display: block;
            color: #f8fafc;
            font-size: 15px;
            line-height: 1.35;
            word-break: break-word;
          }

          .jv-delete-box span {
            display: block;
            margin-top: 6px;
            color: #cbd5e1;
            font-size: 13px;
            line-height: 1.6;
          }

          @media (max-width: 1100px) {
            .jv-stats-grid,
            .jv-filters {
              grid-template-columns: 1fr;
            }

            .jv-deadline-card {
              grid-template-columns: 1fr;
            }

            .jv-actions {
              justify-content: flex-start;
            }
          }

          @media (max-width: 640px) {
            .jv-deadline-hero {
              padding: 28px 22px;
              min-height: auto;
            }

            .jv-deadline-primary,
            .jv-deadline-secondary,
            .jv-deadline-danger,
            .jv-deadline-success {
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

        <section className="jv-deadline-hero">
          <div className="jv-deadline-hero-content">
            <div>
              <div className="jv-kicker">Controle de prazos</div>

              <h1 className="jv-title">Prazos</h1>

              <p className="jv-subtitle">
                Acompanhe prazos pendentes, concluídos e em atraso com vínculo real
                ao processo correspondente.
              </p>
            </div>

            <button className="jv-deadline-primary" onClick={openCreateModal}>
              <FaPlus />
              Novo prazo
            </button>
          </div>
        </section>

        <section className="jv-stats-grid">
          <StatCard
            title="Prazos totais"
            value={stats.total}
            subtitle="Todos os registros"
            Icon={FaCalendarCheck}
          />

          <StatCard
            title="Pendentes"
            value={stats.pending}
            subtitle="Aguardando providência"
            Icon={FaClock}
            tone="yellow"
          />

          <StatCard
            title="Concluídos"
            value={stats.done}
            subtitle="Finalizados"
            Icon={FaCircleCheck}
            tone="green"
          />

          <StatCard
            title="Em atraso"
            value={stats.late}
            subtitle="Pendentes vencidos"
            Icon={FaTriangleExclamation}
            tone="red"
          />
        </section>

        <section className="jv-panel">
          <div className="jv-panel-head">
            <div>
              <div className="jv-panel-title">Lista de prazos</div>
              <div className="jv-panel-subtitle">
                Busque por prazo, cliente, CPF/CNPJ ou número do processo.
              </div>
            </div>
          </div>

          <div className="jv-filters">
            <label className="jv-search-box">
              <FaMagnifyingGlass />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar prazo, cliente, processo..."
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "#CBD5E1",
                    cursor: "pointer",
                  }}
                >
                  <FaXmark />
                </button>
              ) : null}
            </label>

            <div className="jv-mode-tabs">
              <button
                type="button"
                className={filterMode === "pending" ? "jv-mode-tab jv-mode-tab-active" : "jv-mode-tab"}
                onClick={() => setFilterMode("pending")}
              >
                Pendentes
              </button>

              <button
                type="button"
                className={filterMode === "done" ? "jv-mode-tab jv-mode-tab-active" : "jv-mode-tab"}
                onClick={() => setFilterMode("done")}
              >
                Concluídos
              </button>

              <button
                type="button"
                className={filterMode === "late" ? "jv-mode-tab jv-mode-tab-active" : "jv-mode-tab"}
                onClick={() => setFilterMode("late")}
              >
                Em atraso
              </button>

              <button
                type="button"
                className={filterMode === "all" ? "jv-mode-tab jv-mode-tab-active" : "jv-mode-tab"}
                onClick={() => setFilterMode("all")}
              >
                Todos
              </button>
            </div>
          </div>

          {loading ? (
            <div className="jv-empty">Carregando prazos...</div>
          ) : visibleDeadlines.length === 0 ? (
            <div className="jv-empty">Nenhum prazo encontrado para este filtro.</div>
          ) : (
            <div className="jv-list">
              {visibleDeadlines.map((deadline) => {
                const late = !deadline.done && isLate(deadline.dueDate);

                return (
                  <article
                    key={deadline.id}
                    className={late ? "jv-deadline-card jv-deadline-card-late" : "jv-deadline-card"}
                  >
                    <div>
                      <div className="jv-deadline-name">{deadline.title || "Prazo"}</div>

                      <div className="jv-deadline-meta">
                        Vencimento: {formatDate(deadline.dueDate)}
                      </div>

                      {deadline.description ? (
                        <div className="jv-deadline-muted">{deadline.description}</div>
                      ) : null}

                      <div className="jv-pills">
                        <span
                          className={
                            deadline.done
                              ? "jv-pill jv-pill-green"
                              : late
                                ? "jv-pill jv-pill-red"
                                : "jv-pill jv-pill-yellow"
                          }
                        >
                          {deadline.done ? "Concluído" : late ? "Em atraso" : "Pendente"}
                        </span>

                        <span className="jv-pill jv-pill-purple">
                          Cliente: {deadline.process?.client?.name || "Cliente não informado"}
                        </span>

                        <span className="jv-pill jv-pill-blue">
                          Processo: {getProcessNumber(deadline.process)}
                        </span>
                      </div>
                    </div>

                    <div className="jv-actions">
                      {!deadline.done ? (
                        <button
                          className="jv-deadline-success"
                          onClick={() => markDone(deadline, true)}
                        >
                          <FaCircleCheck />
                          Concluir
                        </button>
                      ) : (
                        <button
                          className="jv-deadline-secondary"
                          onClick={() => markDone(deadline, false)}
                        >
                          <FaRotateLeft />
                          Reabrir
                        </button>
                      )}

                      <button
                        className="jv-deadline-secondary"
                        onClick={() => openEditModal(deadline)}
                      >
                        <FaPenToSquare />
                        Editar
                      </button>

                      <button
                        className="jv-deadline-danger"
                        onClick={() => setDeleteAction({ deadline })}
                      >
                        <FaTrash />
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}