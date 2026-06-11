"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowUpRightFromSquare,
  FaBan,
  FaCalculator,
  FaCircleCheck,
  FaClock,
  FaCopy,
  FaEnvelope,
  FaMagnifyingGlass,
  FaMoneyBillWave,
  FaPlus,
  FaRotate,
  FaShieldHalved,
  FaWhatsapp,
  FaXmark,
} from "react-icons/fa6";
import AdminShell from "@/components/AdminShell";
import PremiumModal from "@/components/PremiumModal";
import PremiumToast from "@/components/PremiumToast";

type Role = "SUPERADMIN" | "MASTER" | "SECRETARY";

type MeResponse = {
  id: string;
  name?: string | null;
  role: Role;
  firmId?: string | null;
};

type ClientItem = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
};

type RawProcessItem = {
  id: string;
  cnjNumber?: string | null;
  cnj?: string | null;
  clientId?: string | null;
  client?: {
    id?: string | null;
    name?: string | null;
  } | null;
};

type ProcessItem = {
  id: string;
  cnjNumber?: string | null;
  cnj?: string | null;
  clientId?: string | null;
};

type ChargeItem = {
  id: string;
  amount: string | number;
  currentAmount?: string | number | null;
  originalAmount?: string | number | null;
  dueDate?: string | null;
  expiresAt?: string | null;
  expiredAt?: string | null;
  message?: string | null;
  status: string;
  paymentUrl?: string | null;
  emailTarget?: string | null;
  phoneTarget?: string | null;
  emailSentAt?: string | null;
  previousChargeId?: string | null;
  replacedByChargeId?: string | null;
  lateFeeApplied?: boolean;
  lateFeeType?: string | null;
  lateFeeValue?: number | null;
  createdAt: string;
  createdByUser?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  client?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  process?: {
    id: string;
    cnjNumber?: string | null;
    cnj?: string | null;
  } | null;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type ConfirmAction = "create" | "cancel" | null;

function formatCurrency(value: string | number | null | undefined) {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(num) ? num : 0);
}

function formatDate(value?: string | null) {
  if (!value) return "Não informado";

  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return value;
  }
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

function statusLabel(status: string) {
  switch (status) {
    case "PAID":
      return "Paga";
    case "CANCELLED":
      return "Cancelada";
    case "EXPIRED":
      return "Expirada";
    default:
      return "Pendente";
  }
}

function statusPillClass(status: string) {
  switch (status) {
    case "PAID":
      return "jv-pill-green";
    case "CANCELLED":
      return "jv-pill-red";
    case "EXPIRED":
      return "jv-pill-yellow";
    default:
      return "jv-pill-purple";
  }
}

function toMoneyNumber(value: string) {
  const clean = value.replace(/\./g, "").replace(",", ".");
  const numeric = Number(clean);
  return Number.isFinite(numeric) ? numeric : 0;
}

function calcLateFee(base: number, type: "NONE" | "PERCENT" | "FIXED", value: string) {
  const fee = toMoneyNumber(value);

  if (type === "NONE" || fee <= 0) {
    return {
      increase: 0,
      final: base,
    };
  }

  if (type === "PERCENT") {
    const increase = Number((base * (fee / 100)).toFixed(2));
    return {
      increase,
      final: Number((base + increase).toFixed(2)),
    };
  }

  const increase = Number(fee.toFixed(2));

  return {
    increase,
    final: Number((base + increase).toFixed(2)),
  };
}

export default function ChargesPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [processId, setProcessId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");

  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState("2");
  const [chargeDay, setChargeDay] = useState("10");
  const [hasInterest, setHasInterest] = useState(false);
  const [interestPercent, setInterestPercent] = useState("");
  const [interestStartsAtInstallment, setInterestStartsAtInstallment] = useState("2");
  const [paymentValidityDays, setPaymentValidityDays] = useState("3");
  const [lateFeeType, setLateFeeType] = useState<"NONE" | "PERCENT" | "FIXED">("NONE");
  const [lateFeeValue, setLateFeeValue] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [cancelTarget, setCancelTarget] = useState<ChargeItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId]
  );

  const filteredClients = useMemo(() => {
    const term = normalizeText(clientSearch);
    const digits = onlyDigits(clientSearch);

    if (!term && !digits) return clients;

    return clients.filter((client) => {
      const text = normalizeText(`${client.name} ${client.email || ""} ${client.phone || ""} ${client.document || ""}`);
      const digitText = onlyDigits(`${client.phone || ""} ${client.document || ""}`);

      return text.includes(term) || Boolean(digits && digitText.includes(digits));
    });
  }, [clientSearch, clients]);

  const filteredProcesses = useMemo(() => {
    if (!clientId) return processes;
    return processes.filter((p) => !p.clientId || p.clientId === clientId);
  }, [processes, clientId]);

  const recurringPreview = useMemo(() => {
    const total = toMoneyNumber(amount);
    const totalInstallments = Number(installments);
    const interest = toMoneyNumber(interestPercent);
    const interestStart = Number(interestStartsAtInstallment);

    if (
      !isRecurring ||
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isFinite(totalInstallments) ||
      totalInstallments < 2
    ) {
      return null;
    }

    const totalCents = Math.round(total * 100);
    const baseCents = Math.floor(totalCents / totalInstallments);
    const remainder = totalCents - baseCents * totalInstallments;

    const rows = Array.from({ length: totalInstallments }).map((_, index) => {
      const installmentNumber = index + 1;
      const base = (installmentNumber === totalInstallments ? baseCents + remainder : baseCents) / 100;

      const hasInstallmentInterest =
        hasInterest &&
        Number.isFinite(interest) &&
        interest > 0 &&
        Number.isFinite(interestStart) &&
        installmentNumber >= interestStart;

      const finalAmount = hasInstallmentInterest
        ? Number((base * (1 + interest / 100)).toFixed(2))
        : Number(base.toFixed(2));

      return {
        installmentNumber,
        base,
        finalAmount,
        hasInterest: hasInstallmentInterest,
      };
    });

    return {
      total,
      totalInstallments,
      rows,
    };
  }, [amount, installments, isRecurring, hasInterest, interestPercent, interestStartsAtInstallment]);

  const lateFeePreview = useMemo(() => {
    const base = recurringPreview?.rows[0]?.finalAmount ?? toMoneyNumber(amount);
    return calcLateFee(base, lateFeeType, lateFeeValue);
  }, [amount, lateFeeType, lateFeeValue, recurringPreview]);

  const filteredCharges = useMemo(() => {
    const term = normalizeText(search);
    const digits = onlyDigits(search);

    return charges.filter((charge) => {
      const matchesStatus = statusFilter === "ALL" ? true : charge.status === statusFilter;
      if (!matchesStatus) return false;

      if (!term && !digits) return true;

      const text = normalizeText([
        charge.client?.name,
        charge.emailTarget,
        charge.phoneTarget,
        charge.process?.cnjNumber,
        charge.process?.cnj,
        charge.message,
        statusLabel(charge.status),
      ].filter(Boolean).join(" "));

      const digitText = onlyDigits([
        charge.phoneTarget,
        charge.process?.cnjNumber,
        charge.process?.cnj,
      ].filter(Boolean).join(" "));

      return text.includes(term) || Boolean(digits && digitText.includes(digits));
    });
  }, [charges, search, statusFilter]);

  const stats = useMemo(() => {
    const total = charges.length;
    const pending = charges.filter((c) => c.status === "PENDING").length;
    const paid = charges.filter((c) => c.status === "PAID").length;
    const cancelled = charges.filter((c) => c.status === "CANCELLED").length;
    const expired = charges.filter((c) => c.status === "EXPIRED").length;

    const pendingAmount = charges
      .filter((c) => c.status === "PENDING")
      .reduce((sum, c) => sum + Number(c.currentAmount ?? c.amount ?? 0), 0);

    return { total, pending, paid, cancelled, expired, pendingAmount };
  }, [charges]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [clientsRes, processesRes, chargesRes] = await Promise.all([
        fetch("/api/admin/clients", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/processes?status=all", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/charges", { cache: "no-store", credentials: "include" }),
      ]);

      const [clientsJson, processesJson, chargesJson] = await Promise.all([
        clientsRes.json(),
        processesRes.json(),
        chargesRes.json(),
      ]);

      const rawClients = Array.isArray(clientsJson.data)
        ? clientsJson.data
        : Array.isArray(clientsJson.clients)
          ? clientsJson.clients
          : [];

      const rawProcesses = Array.isArray(processesJson.data)
        ? processesJson.data
        : Array.isArray(processesJson.processes)
          ? processesJson.processes
          : [];

      const rawCharges = Array.isArray(chargesJson.data) ? chargesJson.data : [];

      setClients(rawClients);
      setProcesses(
        rawProcesses.map((p: RawProcessItem) => ({
          id: p.id,
          cnjNumber: p.cnjNumber ?? null,
          cnj: p.cnj ?? null,
          clientId: p.clientId ?? p.client?.id ?? null,
        }))
      );
      setCharges(rawCharges);
    } catch {
      showToast("Falha ao carregar cobranças.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        setAuthLoading(true);

        const response = await fetch("/api/me", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await response.json();

        if (!response.ok || !json?.ok || !json?.user) {
          window.location.href = "/login";
          return;
        }

        const user = json.user as MeResponse;

        if (user.role !== "MASTER" && user.role !== "SECRETARY") {
          window.location.href = "/admin";
          return;
        }

        if (mounted) setMe(user);
      } catch {
        window.location.href = "/login";
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    void loadMe();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!me) return;
    void loadData();
  }, [me, loadData]);

  function showToast(message: string, type: ToastState["type"] = "info") {
    setToast({ open: true, message, type });
  }

  function validateBeforeConfirm() {
    const numericAmount = toMoneyNumber(amount);

    if (!clientId) {
      showToast("Selecione o cliente.", "warning");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast("Informe um valor válido para a cobrança.", "warning");
      return;
    }

    if (isRecurring) {
      if (Number(installments) < 2) {
        showToast("Cobrança recorrente precisa ter pelo menos 2 parcelas.", "warning");
        return;
      }

      if (Number(chargeDay) < 1 || Number(chargeDay) > 28) {
        showToast("O dia de cobrança precisa estar entre 1 e 28.", "warning");
        return;
      }
    }

    setConfirmAction("create");
  }

  async function createCharge() {
    try {
      setSubmitting(true);

      const numericAmount = toMoneyNumber(amount);
      let response: Response;

      if (isRecurring) {
        response = await fetch("/api/admin/charges/recurring", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            description:
              message.trim() ||
              `Cobrança recorrente para ${selectedClient?.name || "cliente"}`,
            baseAmount: numericAmount,
            installments: Number(installments),
            chargeDay: Number(chargeDay),
            hasInterest,
            interestPercent:
              hasInterest && interestPercent.trim()
                ? toMoneyNumber(interestPercent)
                : null,
            interestStartsAtInstallment:
              hasInterest && interestStartsAtInstallment.trim()
                ? Number(interestStartsAtInstallment)
                : null,
            paymentValidityDays: paymentValidityDays.trim()
              ? Number(paymentValidityDays)
              : 3,
            lateFeeType,
            lateFeeValue:
              lateFeeType !== "NONE" && lateFeeValue.trim()
                ? toMoneyNumber(lateFeeValue)
                : null,
          }),
        });
      } else {
        response = await fetch("/api/admin/charges", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            processId: processId || null,
            amount: numericAmount,
            dueDate: dueDate || null,
            message: message.trim() || null,
          }),
        });
      }

      const json = await response.json();

      if (!response.ok || !json?.ok) {
        throw new Error(json?.message || "Falha ao criar cobrança.");
      }

      setConfirmAction(null);
      setClientId("");
      setClientSearch("");
      setProcessId("");
      setAmount("");
      setDueDate("");
      setMessage("");
      setIsRecurring(false);
      setInstallments("2");
      setChargeDay("10");
      setHasInterest(false);
      setInterestPercent("");
      setInterestStartsAtInstallment("2");
      setPaymentValidityDays("3");
      setLateFeeType("NONE");
      setLateFeeValue("");

      showToast(
        isRecurring
          ? "Cobrança recorrente criada com sucesso."
          : "Cobrança criada com sucesso.",
        "success"
      );

      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao criar cobrança.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelCharge() {
    if (!cancelTarget) return;

    try {
      setSubmitting(true);

      const response = await fetch(`/api/admin/charges/${cancelTarget.id}/cancel`, {
        method: "POST",
        credentials: "include",
      });

      const json = await response.json();

      if (!response.ok || !json?.ok) {
        throw new Error(json?.message || "Falha ao cancelar cobrança.");
      }

      setCancelTarget(null);
      setConfirmAction(null);
      showToast("Cobrança cancelada com sucesso.", "success");
      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao cancelar cobrança.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function buildWhatsAppLink(charge: ChargeItem) {
    const phone = (charge.phoneTarget || "").replace(/\D/g, "");
    if (!phone || !charge.paymentUrl || charge.status === "CANCELLED") return null;

    const due = charge.dueDate ? formatDate(charge.dueDate) : "Não informado";
    const lawyerName = charge.createdByUser?.name || "Seu advogado";
    const clientName = charge.client?.name || "cliente";

    const text = [
      `Olá, ${clientName}`,
      "",
      `${lawyerName} gerou uma cobrança para você no valor de ${formatCurrency(charge.currentAmount ?? charge.amount)}, com vencimento em ${due}.`,
      "",
      "Para efetuar o pagamento, acesse:",
      charge.paymentUrl,
      "",
      "Caso já tenha efetuado o pagamento, favor desconsiderar esta mensagem.",
    ].join("\n");

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  async function copyLink(url?: string | null) {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    showToast("Link da cobrança copiado.", "success");
  }

  if (authLoading || !me) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#fff" }}>
        Carregando cobranças...
      </div>
    );
  }

  return (
    <AdminShell userName={me.name || "Usuário"} role={me.role}>
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PremiumModal
        open={confirmAction === "create"}
        onClose={() => {
          if (!submitting) setConfirmAction(null);
        }}
        title={isRecurring ? "Confirmar cobrança recorrente" : "Confirmar cobrança"}
        description="Confira a prévia antes de gerar o link de pagamento."
        footer={
          <>
            <button className="jv-premium-btn-secondary" onClick={() => setConfirmAction(null)} disabled={submitting}>
              Voltar
            </button>
            <button className="jv-premium-btn" onClick={createCharge} disabled={submitting}>
              {submitting ? "Criando..." : "Criar e enviar cobrança"}
            </button>
          </>
        }
      >
        <div className="jv-preview-modal">
          <div>
            <span>Cliente</span>
            <strong>{selectedClient?.name || "Não informado"}</strong>
          </div>
          <div>
            <span>Tipo</span>
            <strong>{isRecurring ? "Recorrente" : "Única"}</strong>
          </div>
          <div>
            <span>Valor base</span>
            <strong>{formatCurrency(toMoneyNumber(amount))}</strong>
          </div>
          {isRecurring ? (
            <>
              <div>
                <span>Parcelas</span>
                <strong>{installments}x</strong>
              </div>
              <div>
                <span>Dia de cobrança</span>
                <strong>Todo dia {chargeDay}</strong>
              </div>
              <div>
                <span>Validade do link</span>
                <strong>{paymentValidityDays} dia(s)</strong>
              </div>
              <div>
                <span>Valor após atraso</span>
                <strong>{formatCurrency(lateFeePreview.final)}</strong>
              </div>
            </>
          ) : dueDate ? (
            <div>
              <span>Vencimento</span>
              <strong>{formatDate(dueDate)}</strong>
            </div>
          ) : null}
        </div>
      </PremiumModal>

      <PremiumModal
        open={!!cancelTarget}
        onClose={() => {
          if (!submitting) setCancelTarget(null);
        }}
        title="Cancelar cobrança"
        description="A cobrança será marcada como cancelada e o cliente não deve mais usar este link."
        footer={
          <>
            <button className="jv-premium-btn-secondary" onClick={() => setCancelTarget(null)} disabled={submitting}>
              Voltar
            </button>
            <button
              className="jv-premium-btn"
              onClick={cancelCharge}
              disabled={submitting}
              style={{ background: "linear-gradient(135deg, #ef4444, #7f1d1d)" }}
            >
              {submitting ? "Cancelando..." : "Cancelar cobrança"}
            </button>
          </>
        }
        size="sm"
      >
        <div className="jv-confirm-box">
          <strong>{cancelTarget?.client?.name || "Cliente"}</strong>
          <span>{formatCurrency(cancelTarget?.currentAmount ?? cancelTarget?.amount ?? 0)}</span>
        </div>
      </PremiumModal>

      <div className="jv-charges-page">
        <style>{`
          .jv-charges-page { display: grid; gap: 20px; }
          .jv-charges-page * { box-sizing: border-box; }

          .jv-hero {
            min-height: 230px;
            border-radius: 28px;
            border: 1px solid rgba(168,85,247,.22);
            background:
              linear-gradient(90deg, rgba(7,10,23,.96), rgba(12,15,31,.84), rgba(17,24,39,.72)),
              radial-gradient(circle at 82% 17%, rgba(124,58,237,.34), transparent 32%),
              linear-gradient(135deg, #090b16, #111827);
            padding: 34px 38px;
            box-shadow: 0 34px 90px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.045);
          }

          .jv-hero-content {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            flex-wrap: wrap;
          }

          .jv-kicker {
            width: fit-content;
            color: #c4b5fd;
            background: rgba(255,255,255,.045);
            border: 1px solid rgba(255,255,255,.08);
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: .08em;
          }

          .jv-title {
            margin: 16px 0 0;
            color: #f8fafc;
            font-size: clamp(36px,4vw,54px);
            font-weight: 950;
            line-height: .98;
            letter-spacing: -.06em;
          }

          .jv-subtitle {
            margin: 12px 0 0;
            color: #cbd5e1;
            font-size: 16px;
            line-height: 1.7;
            max-width: 880px;
          }

          .jv-stats-grid {
            display: grid;
            grid-template-columns: repeat(4,minmax(0,1fr));
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
            border: 1px solid rgba(148,163,184,.16);
            background:
              radial-gradient(circle at 95% 5%, rgba(124,58,237,.18), transparent 32%),
              linear-gradient(180deg, rgba(15,23,42,.88), rgba(15,23,42,.64));
            box-shadow: 0 26px 60px rgba(0,0,0,.27);
          }

          .jv-stat-icon {
            width: 58px;
            height: 58px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            color: #d8b4fe;
            background: radial-gradient(circle, rgba(168,85,247,.40), rgba(15,23,42,.70));
            font-size: 24px;
          }

          .jv-stat-title { color: #a1a1aa; font-size: 13px; }
          .jv-stat-value { margin-top: 6px; color: #f8fafc; font-size: 34px; font-weight: 950; line-height: 1; }
          .jv-stat-subtitle { margin-top: 8px; color: #a1a1aa; font-size: 13px; }

          .jv-layout {
            display: grid;
            grid-template-columns: minmax(360px,.52fr) minmax(0,1fr);
            gap: 16px;
            align-items: start;
          }

          .jv-panel {
            border-radius: 24px;
            border: 1px solid rgba(168,85,247,.22);
            background:
              radial-gradient(circle at 0% 0%, rgba(124,58,237,.11), transparent 30%),
              linear-gradient(180deg, rgba(15,23,42,.88), rgba(15,23,42,.56));
            box-shadow: 0 28px 70px rgba(0,0,0,.26);
            padding: 22px;
          }

          .jv-panel-title {
            color: #f8fafc;
            font-size: 24px;
            font-weight: 950;
            letter-spacing: -.045em;
          }

          .jv-panel-subtitle {
            margin-top: 5px;
            color: #94a3b8;
            font-size: 14px;
            line-height: 1.6;
          }

          .jv-form { display: grid; gap: 12px; margin-top: 16px; }

          .jv-input,
          .jv-select,
          .jv-textarea {
            width: 100%;
            min-height: 52px;
            border-radius: 16px;
            border: 1px solid rgba(148,163,184,.16);
            background: rgba(15,23,42,.72);
            color: #f8fafc;
            padding: 0 15px;
            outline: none;
            color-scheme: dark;
          }

          .jv-select option { background: #111827; color: #f8fafc; }

          .jv-textarea {
            min-height: 110px;
            padding: 14px 15px;
            resize: vertical;
          }

          .jv-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .jv-info-box {
            min-height: 56px;
            display: grid;
            gap: 4px;
            border-radius: 16px;
            border: 1px solid rgba(148,163,184,.14);
            background: rgba(255,255,255,.035);
            padding: 12px 14px;
          }

          .jv-info-box span { color: #94a3b8; font-size: 12px; font-weight: 800; }
          .jv-info-box strong { color: #f8fafc; font-size: 14px; word-break: break-word; }

          .jv-switch {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 56px;
            border-radius: 16px;
            border: 1px solid rgba(148,163,184,.14);
            background: rgba(255,255,255,.035);
            padding: 12px 14px;
            color: #e5e7eb;
            font-weight: 900;
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
            background: linear-gradient(135deg,#a855f7,#4f46e5);
            box-shadow: 0 18px 40px rgba(79,70,229,.22);
          }

          .jv-secondary {
            color: #e5e7eb;
            background: rgba(255,255,255,.045);
            border: 1px solid rgba(148,163,184,.15);
          }

          .jv-danger {
            color: #fecaca;
            background: rgba(127,29,29,.18);
            border: 1px solid rgba(248,113,113,.25);
          }

          .jv-success {
            color: #a7f3d0;
            background: rgba(6,78,59,.18);
            border: 1px solid rgba(52,211,153,.24);
          }

          .jv-preview-box {
            display: grid;
            gap: 10px;
            border-radius: 18px;
            border: 1px solid rgba(168,85,247,.20);
            background: rgba(124,58,237,.08);
            padding: 14px;
          }

          .jv-preview-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            color: #cbd5e1;
            font-size: 13px;
          }

          .jv-preview-row strong { color: #f8fafc; }

          .jv-installments {
            display: grid;
            gap: 7px;
            max-height: 220px;
            overflow: auto;
            padding-right: 4px;
          }

          .jv-installment-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            border-radius: 12px;
            background: rgba(255,255,255,.035);
            padding: 8px 10px;
            color: #cbd5e1;
            font-size: 12px;
          }

          .jv-filters {
            display: grid;
            grid-template-columns: minmax(280px,1fr) auto;
            gap: 12px;
            margin: 16px 0;
          }

          .jv-search-box {
            min-height: 52px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-radius: 16px;
            border: 1px solid rgba(148,163,184,.16);
            background: rgba(15,23,42,.62);
            padding: 0 15px;
            color: #cbd5e1;
          }

          .jv-search-box input {
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #f8fafc;
          }

          .jv-list { display: grid; gap: 13px; }

          .jv-charge-card {
            display: grid;
            grid-template-columns: minmax(260px,1fr) auto;
            gap: 18px;
            align-items: center;
            padding: 18px;
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,.13);
            background: rgba(255,255,255,.035);
          }

          .jv-charge-title {
            color: #f8fafc;
            font-size: 19px;
            font-weight: 950;
          }

          .jv-charge-meta,
          .jv-charge-muted {
            margin-top: 7px;
            color: #94a3b8;
            font-size: 13px;
            line-height: 1.6;
          }

          .jv-charge-amount {
            margin-top: 8px;
            color: #fff;
            font-size: 25px;
            font-weight: 950;
          }

          .jv-pills,
          .jv-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .jv-pills { margin-top: 12px; }
          .jv-actions { justify-content: flex-end; }

          .jv-pill {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 8px 11px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
          }

          .jv-pill-purple { color: #ddd6fe; background: rgba(124,58,237,.13); border: 1px solid rgba(168,85,247,.24); }
          .jv-pill-blue { color: #bfdbfe; background: rgba(59,130,246,.13); border: 1px solid rgba(96,165,250,.24); }
          .jv-pill-green { color: #a7f3d0; background: rgba(6,78,59,.18); border: 1px solid rgba(52,211,153,.24); }
          .jv-pill-red { color: #fecaca; background: rgba(127,29,29,.18); border: 1px solid rgba(248,113,113,.24); }
          .jv-pill-yellow { color: #fde68a; background: rgba(202,138,4,.14); border: 1px solid rgba(245,158,11,.24); }

          .jv-empty {
            padding: 22px;
            border-radius: 20px;
            background: rgba(255,255,255,.035);
            border: 1px dashed rgba(148,163,184,.22);
            color: #94a3b8;
            text-align: center;
          }

          .jv-confirm-box,
          .jv-preview-modal {
            display: grid;
            gap: 10px;
            padding: 16px;
            border-radius: 18px;
            background: rgba(255,255,255,.035);
            border: 1px solid rgba(148,163,184,.16);
          }

          .jv-preview-modal div {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }

          .jv-preview-modal span,
          .jv-confirm-box span { color: #94a3b8; }

          .jv-preview-modal strong,
          .jv-confirm-box strong { color: #f8fafc; }

          @media (max-width: 1200px) {
            .jv-stats-grid,
            .jv-layout,
            .jv-filters {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .jv-hero { padding: 28px 22px; min-height: auto; }
            .jv-grid-2 { grid-template-columns: 1fr; }
            .jv-charge-card { grid-template-columns: 1fr; }
            .jv-actions { display: grid; justify-content: stretch; }
            .jv-primary, .jv-secondary, .jv-danger, .jv-success { width: 100%; }
          }
        `}</style>

        <section className="jv-hero">
          <div className="jv-hero-content">
            <div>
              <div className="jv-kicker">Financeiro</div>
              <h1 className="jv-title">Cobranças</h1>
              <p className="jv-subtitle">
                Crie cobranças únicas ou recorrentes, acompanhe pagamentos, aplique regras de atraso e compartilhe links com o cliente.
              </p>
            </div>

            <button className="jv-secondary" onClick={() => void loadData()}>
              <FaRotate />
              Processar recorrências
            </button>
          </div>
        </section>

        <section className="jv-stats-grid">
          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaMoneyBillWave /></div>
            <div>
              <div className="jv-stat-title">Total</div>
              <div className="jv-stat-value">{stats.total}</div>
              <div className="jv-stat-subtitle">Cobranças registradas</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaClock /></div>
            <div>
              <div className="jv-stat-title">Pendentes</div>
              <div className="jv-stat-value">{stats.pending}</div>
              <div className="jv-stat-subtitle">{formatCurrency(stats.pendingAmount)} em aberto</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaCircleCheck /></div>
            <div>
              <div className="jv-stat-title">Pagas</div>
              <div className="jv-stat-value">{stats.paid}</div>
              <div className="jv-stat-subtitle">Pagamentos aprovados</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon"><FaShieldHalved /></div>
            <div>
              <div className="jv-stat-title">Expiradas</div>
              <div className="jv-stat-value">{stats.expired}</div>
              <div className="jv-stat-subtitle">Substituídas ou vencidas</div>
            </div>
          </article>
        </section>

        <section className="jv-layout">
          <div className="jv-panel">
            <div className="jv-panel-title">Nova cobrança</div>
            <div className="jv-panel-subtitle">
              Configure o valor, vencimento, recorrência e regras de atraso.
            </div>

            <div className="jv-form">
              <input
                className="jv-input"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Buscar cliente por nome, CPF/CNPJ, e-mail ou telefone"
              />

              <select className="jv-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">Selecione um cliente</option>
                {filteredClients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>

              <div className="jv-grid-2">
                <div className="jv-info-box">
                  <span>E-mail</span>
                  <strong>{selectedClient?.email || "Não informado"}</strong>
                </div>
                <div className="jv-info-box">
                  <span>Telefone</span>
                  <strong>{selectedClient?.phone || "Não informado"}</strong>
                </div>
              </div>

              <select className="jv-select" value={processId} onChange={(e) => setProcessId(e.target.value)} disabled={isRecurring}>
                <option value="">Nenhum processo vinculado</option>
                {filteredProcesses.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.cnjNumber || process.cnj || process.id}
                  </option>
                ))}
              </select>

              <div className="jv-grid-2">
                <input className="jv-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor total. Ex.: 1500,00" />
                <input className="jv-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isRecurring} />
              </div>

              <textarea className="jv-textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensagem opcional para o cliente" />

              <label className="jv-switch">
                <span>Cobrança recorrente</span>
                <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
              </label>

              {isRecurring ? (
                <>
                  <div className="jv-grid-2">
                    <input className="jv-input" type="number" min="2" value={installments} onChange={(e) => setInstallments(e.target.value)} placeholder="Parcelas" />
                    <input className="jv-input" type="number" min="1" max="28" value={chargeDay} onChange={(e) => setChargeDay(e.target.value)} placeholder="Dia de cobrança" />
                  </div>

                  <div className="jv-grid-2">
                    <input className="jv-input" type="number" min="1" value={paymentValidityDays} onChange={(e) => setPaymentValidityDays(e.target.value)} placeholder="Validade do link em dias" />
                    <select className="jv-select" value={lateFeeType} onChange={(e) => setLateFeeType(e.target.value as "NONE" | "PERCENT" | "FIXED")}>
                      <option value="NONE">Sem multa por atraso</option>
                      <option value="PERCENT">Multa percentual</option>
                      <option value="FIXED">Multa fixa</option>
                    </select>
                  </div>

                  {lateFeeType !== "NONE" ? (
                    <input className="jv-input" value={lateFeeValue} onChange={(e) => setLateFeeValue(e.target.value)} placeholder={lateFeeType === "PERCENT" ? "Percentual de atraso. Ex.: 2" : "Valor fixo. Ex.: 50,00"} />
                  ) : null}

                  <label className="jv-switch">
                    <span>Aplicar juros nas parcelas</span>
                    <input type="checkbox" checked={hasInterest} onChange={(e) => setHasInterest(e.target.checked)} />
                  </label>

                  {hasInterest ? (
                    <div className="jv-grid-2">
                      <input className="jv-input" value={interestPercent} onChange={(e) => setInterestPercent(e.target.value)} placeholder="Juros %. Ex.: 5" />
                      <input className="jv-input" type="number" min="2" value={interestStartsAtInstallment} onChange={(e) => setInterestStartsAtInstallment(e.target.value)} placeholder="A partir da parcela" />
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="jv-preview-box">
                <div className="jv-preview-row">
                  <span>Valor base</span>
                  <strong>{formatCurrency(toMoneyNumber(amount))}</strong>
                </div>

                {isRecurring && recurringPreview ? (
                  <>
                    <div className="jv-preview-row">
                      <span>Modelo</span>
                      <strong>{installments} parcelas · dia {chargeDay}</strong>
                    </div>
                    <div className="jv-preview-row">
                      <span>Se atrasar</span>
                      <strong>{formatCurrency(lateFeePreview.final)}</strong>
                    </div>
                    <div className="jv-installments">
                      {recurringPreview.rows.map((row) => (
                        <div className="jv-installment-row" key={row.installmentNumber}>
                          <span>Parcela {row.installmentNumber}</span>
                          <strong>{formatCurrency(row.finalAmount)}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="jv-preview-row">
                    <span>Tipo</span>
                    <strong>Cobrança única</strong>
                  </div>
                )}
              </div>

              <button className="jv-primary" type="button" onClick={validateBeforeConfirm}>
                <FaPlus />
                Criar e enviar cobrança
              </button>
            </div>
          </div>

          <div className="jv-panel">
            <div className="jv-panel-title">Cobranças recentes</div>
            <div className="jv-panel-subtitle">Acompanhe links, pagamentos e status das cobranças.</div>

            <div className="jv-filters">
              <label className="jv-search-box">
                <FaMagnifyingGlass />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente, e-mail, telefone ou processo" />
                {search ? <button type="button" onClick={() => setSearch("")} style={{ border: 0, background: "transparent", color: "#CBD5E1", cursor: "pointer" }}><FaXmark /></button> : null}
              </label>

              <select className="jv-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">Todos os status</option>
                <option value="PENDING">Pendentes</option>
                <option value="PAID">Pagas</option>
                <option value="EXPIRED">Expiradas</option>
                <option value="CANCELLED">Canceladas</option>
              </select>
            </div>

            {loading ? (
              <div className="jv-empty">Carregando cobranças...</div>
            ) : filteredCharges.length === 0 ? (
              <div className="jv-empty">Nenhuma cobrança encontrada com os filtros atuais.</div>
            ) : (
              <div className="jv-list">
                {filteredCharges.map((charge) => {
                  const whatsapp = buildWhatsAppLink(charge);
                  const amountValue = charge.currentAmount ?? charge.amount;

                  return (
                    <article className="jv-charge-card" key={charge.id}>
                      <div>
                        <div className="jv-charge-title">{charge.client?.name || "Cliente"}</div>
                        <div className="jv-charge-amount">{formatCurrency(amountValue)}</div>
                        <div className="jv-charge-meta">Vencimento: {formatDate(charge.dueDate)}</div>
                        <div className="jv-charge-muted">{charge.message || "Cobrança sem descrição."}</div>

                        <div className="jv-pills">
                          <span className={`jv-pill ${statusPillClass(charge.status)}`}>{statusLabel(charge.status)}</span>
                          {charge.emailSentAt ? <span className="jv-pill jv-pill-green"><FaEnvelope /> E-mail enviado</span> : null}
                          {charge.lateFeeApplied ? <span className="jv-pill jv-pill-yellow">Juros aplicado</span> : null}
                          {charge.previousChargeId ? <span className="jv-pill jv-pill-blue">Substituta</span> : null}
                        </div>
                      </div>

                      <div className="jv-actions">
                        {charge.paymentUrl && charge.status !== "CANCELLED" ? (
                          <>
                            <a className="jv-secondary" href={charge.paymentUrl} target="_blank">
                              <FaArrowUpRightFromSquare />
                              Abrir
                            </a>
                            <button className="jv-secondary" onClick={() => copyLink(charge.paymentUrl)}>
                              <FaCopy />
                              Copiar
                            </button>
                          </>
                        ) : null}

                        {whatsapp ? (
                          <a className="jv-success" href={whatsapp} target="_blank">
                            <FaWhatsapp />
                            WhatsApp
                          </a>
                        ) : null}

                        {charge.status === "PENDING" ? (
                          <button className="jv-danger" onClick={() => setCancelTarget(charge)}>
                            <FaBan />
                            Cancelar
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}