"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";

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
};

type RawProcessItem = {
  id: string;
  cnjNumber?: string | null;
  cnj?: string | null;
  clientId?: string | null;
  client?: {
    id?: string | null;
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
  dueDate?: string | null;
  message?: string | null;
  status: string;
  paymentUrl?: string | null;
  emailTarget?: string | null;
  phoneTarget?: string | null;
  emailSentAt?: string | null;
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
  } | null;
  process?: {
    id: string;
    cnjNumber?: string | null;
    cnj?: string | null;
  } | null;
};

function formatCurrency(value: string | number) {
  const num = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(num) ? num : 0);
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

function statusClass(status: string) {
  switch (status) {
    case "PAID":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20";
    case "CANCELLED":
      return "bg-red-500/15 text-red-300 ring-1 ring-red-400/20";
    case "EXPIRED":
      return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20";
    default:
      return "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20";
  }
}

const fieldClassName =
  "w-full appearance-none rounded-2xl border border-white/10 bg-zinc-950/100 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 shadow-inner shadow-black/30 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20";
const infoBoxClassName =
  "min-h-[56px] rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 break-words overflow-hidden";
const sectionCardClassName =
  "rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl backdrop-blur-xl";

export default function ChargesPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId],
  );

  const filteredProcesses = useMemo(() => {
    if (!clientId) return processes;
    return processes.filter((p) => !p.clientId || p.clientId === clientId);
  }, [processes, clientId]);

  const recurringPreview = useMemo(() => {
    const total = Number(amount.replace(",", "."));
    const totalInstallments = Number(installments);
    const interest = Number(interestPercent.replace(",", "."));
    const interestStart = Number(interestStartsAtInstallment);

    if (!isRecurring || !Number.isFinite(total) || total <= 0 || !Number.isFinite(totalInstallments) || totalInstallments < 2) {
      return null;
    }

    const totalCents = Math.round(total * 100);
    const baseCents = Math.floor(totalCents / totalInstallments);
    const remainder = totalCents - baseCents * totalInstallments;

    const firstInstallmentValue = baseCents / 100;
    const lastBaseInstallmentValue =
      (baseCents + remainder) / 100;

    let installmentWithInterest = firstInstallmentValue;

    if (hasInterest && Number.isFinite(interest) && interest > 0) {
      installmentWithInterest = Number(
        (firstInstallmentValue * (1 + interest / 100)).toFixed(2)
      );
    }

    return {
      total,
      totalInstallments,
      firstInstallmentValue,
      lastBaseInstallmentValue,
      installmentWithInterest,
      interestStart: Number.isFinite(interestStart) && interestStart > 0 ? interestStart : null,
      hasInterest: hasInterest && Number.isFinite(interest) && interest > 0,
      interest,
    };
  }, [
    amount,
    installments,
    isRecurring,
    hasInterest,
    interestPercent,
    interestStartsAtInstallment,
  ]);

  const filteredCharges = useMemo(() => {
    const query = search.trim().toLowerCase();

    return charges.filter((charge) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : charge.status === statusFilter;

      if (!matchesStatus) return false;

      if (!query) return true;

      const haystack = [
        charge.client?.name,
        charge.emailTarget,
        charge.phoneTarget,
        charge.process?.cnjNumber,
        charge.process?.cnj,
        charge.message,
        statusLabel(charge.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [charges, search, statusFilter]);

  const stats = useMemo(() => {
    const total = charges.length;
    const pending = charges.filter((c) => c.status === "PENDING").length;
    const paid = charges.filter((c) => c.status === "PAID").length;
    const cancelled = charges.filter((c) => c.status === "CANCELLED").length;

    const pendingAmount = charges
      .filter((c) => c.status === "PENDING")
      .reduce((sum, c) => sum + Number(c.amount || 0), 0);

    return {
      total,
      pending,
      paid,
      cancelled,
      pendingAmount,
    };
  }, [charges]);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        setAuthLoading(true);

        const response = await fetch("/api/me", {
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok || !json?.ok || !json?.user) {
          router.replace("/login");
          return;
        }

        const user = json.user as MeResponse;

        if (user.role !== "MASTER" && user.role !== "SECRETARY") {
          router.replace("/admin");
          return;
        }

        if (mounted) {
          setMe(user);
        }
      } catch {
        router.replace("/login");
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    }

    void loadMe();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [clientsRes, processesRes, chargesRes] = await Promise.all([
        fetch("/api/admin/clients", { cache: "no-store" }),
        fetch("/api/admin/processes", { cache: "no-store" }),
        fetch("/api/admin/charges", { cache: "no-store" }),
      ]);

      const [clientsJson, processesJson, chargesJson] = await Promise.all([
        clientsRes.json(),
        processesRes.json(),
        chargesRes.json(),
      ]);

      if (!clientsJson?.ok) {
        throw new Error(clientsJson?.message || "Falha ao carregar clientes.");
      }

      if (!processesJson?.ok) {
        throw new Error(processesJson?.message || "Falha ao carregar processos.");
      }

      if (!chargesJson?.ok) {
        throw new Error(chargesJson?.message || "Falha ao carregar cobranças.");
      }

      const rawClients = Array.isArray(clientsJson.data)
        ? (clientsJson.data as ClientItem[])
        : Array.isArray(clientsJson.clients)
          ? (clientsJson.clients as ClientItem[])
          : [];

      const rawProcesses = Array.isArray(processesJson.data)
        ? (processesJson.data as RawProcessItem[])
        : Array.isArray(processesJson.processes)
          ? (processesJson.processes as RawProcessItem[])
          : [];

      const rawCharges = Array.isArray(chargesJson.data)
        ? (chargesJson.data as ChargeItem[])
        : [];

      setClients(rawClients);
      setProcesses(
        rawProcesses.map((p) => ({
          id: p.id,
          cnjNumber: p.cnjNumber ?? null,
          cnj: p.cnj ?? null,
          clientId: p.clientId ?? p.client?.id ?? null,
        })),
      );
      setCharges(rawCharges);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar página.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!me) return;
    void loadData();
  }, [me]);

  async function handleCreateCharge(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);
      setFeedback(null);

      const numericAmount = Number(amount.replace(",", "."));

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Informe um valor válido para a cobrança.");
      }

      let response: Response;

      if (isRecurring) {
        response = await fetch("/api/admin/charges/recurring", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
                ? Number(interestPercent.replace(",", "."))
                : null,
            interestStartsAtInstallment:
              hasInterest && interestStartsAtInstallment.trim()
                ? Number(interestStartsAtInstallment)
                : null,
          }),
        });
      } else {
        response = await fetch("/api/admin/charges", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

      if (!json?.ok) {
        throw new Error(
          json?.message ||
            (isRecurring
              ? "Falha ao criar cobrança recorrente."
              : "Falha ao criar cobrança."),
        );
      }

      setFeedback(
        isRecurring
          ? "Cobrança recorrente criada com sucesso."
          : "Cobrança criada com sucesso. Se o cliente tiver e-mail cadastrado, a cobrança foi encaminhada automaticamente.",
      );

      setClientId("");
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

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao criar cobrança.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelCharge(chargeId: string) {
    const confirmed = window.confirm("Deseja realmente cancelar esta cobrança?");
    if (!confirmed) return;

    try {
      setCancelingId(chargeId);
      setError(null);
      setFeedback(null);

      const response = await fetch(`/api/admin/charges/${chargeId}/cancel`, {
        method: "POST",
      });

      const json = await response.json();

      if (!json?.ok) {
        throw new Error(json?.message || "Falha ao cancelar cobrança.");
      }

      setFeedback(json?.message || "Cobrança cancelada com sucesso.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cancelar cobrança.");
    } finally {
      setCancelingId(null);
    }
  }

  function buildWhatsAppLink(charge: ChargeItem) {
    const phone = (charge.phoneTarget || "").replace(/\D/g, "");
    if (!phone || !charge.paymentUrl || charge.status === "CANCELLED") return null;

    const dueDate = charge.dueDate
      ? new Date(charge.dueDate).toLocaleDateString("pt-BR")
      : "Não informado";

    const lawyerName = charge.createdByUser?.name || "Seu advogado";
    const lawyerEmail = charge.createdByUser?.email || "Não informado";
    const lawyerPhone = charge.createdByUser?.phone || "Não informado";
    const clientName = charge.client?.name || "cliente";

    const text = [
      `Olá, ${clientName}`,
      "",
      `${lawyerName} gerou uma cobrança para você no valor de ${formatCurrency(charge.amount)}, com vencimento em ${dueDate}.`,
      "",
      "Para efetuar o pagamento e visualizar mais informações da cobrança, clique no link:",
      charge.paymentUrl,
      "",
      "Se você não reconhece essa cobrança, ou tem alguma dúvida sobre o pagamento, entre em contato com o seu fornecedor:",
      `Telefone: ${lawyerPhone}`,
      `Email: ${lawyerEmail}`,
      "",
      "Caso você já tenha efetuado o pagamento nas últimas 48 horas, favor desconsiderar esta mensagem.",
    ].join("\n");

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  async function handleCopyLink(url?: string | null) {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setFeedback("Link da cobrança copiado com sucesso.");
  }

  if (authLoading || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        Carregando...
      </div>
    );
  }

  return (
    <AdminShell userName={me.name || "Usuário"} role={me.role}>
      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-cyan-500/10 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
              Financeiro
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Cobranças
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-zinc-300">
              Gere cobranças para seus clientes, envie por e-mail e compartilhe por WhatsApp.
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-xl">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Total</div>
            <div className="mt-3 text-3xl font-bold text-white">{stats.total}</div>
            <div className="mt-1 text-sm text-zinc-400">Cobranças registradas</div>
          </div>

          <div className="rounded-3xl border border-violet-500/20 bg-violet-500/10 p-5 shadow-xl">
            <div className="text-xs uppercase tracking-[0.18em] text-violet-300/70">Pendentes</div>
            <div className="mt-3 text-3xl font-bold text-white">{stats.pending}</div>
            <div className="mt-1 text-sm text-violet-200/80">{formatCurrency(stats.pendingAmount)} em aberto</div>
          </div>

          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-xl">
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-300/70">Pagas</div>
            <div className="mt-3 text-3xl font-bold text-white">{stats.paid}</div>
            <div className="mt-1 text-sm text-emerald-200/80">Cobranças concluídas</div>
          </div>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 shadow-xl">
            <div className="text-xs uppercase tracking-[0.18em] text-red-300/70">Canceladas</div>
            <div className="mt-3 text-3xl font-bold text-white">{stats.cancelled}</div>
            <div className="mt-1 text-sm text-red-200/80">Cobranças encerradas</div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {feedback ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {feedback}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
          <form
            onSubmit={handleCreateCharge}
            className={sectionCardClassName}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Nova cobrança</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Crie uma cobrança e dispare os canais de contato do cliente.
                </p>
              </div>
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300">
                Mercado Pago
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-200">
                  Cliente
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={`${fieldClassName} [&>option]:bg-zinc-950 [&>option]:text-zinc-100`} style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-zinc-200">
                    E-mail identificado
                  </label>
                  <div className={infoBoxClassName}>
                    {selectedClient?.email || "Não informado"}
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium text-zinc-200">
                    Telefone identificado
                  </label>
                  <div className={infoBoxClassName}>
                    {selectedClient?.phone || "Não informado"}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-200">
                  Processo (opcional)
                </label>
                <select
                  value={processId}
                  onChange={(e) => setProcessId(e.target.value)}
                  className={`${fieldClassName} [&>option]:bg-zinc-950 [&>option]:text-zinc-100`} style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                >
                  <option value="">Nenhum processo vinculado</option>
                  {filteredProcesses.map((process) => (
                    <option key={process.id} value={process.id}>
                      {process.cnjNumber || process.cnj || process.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-200">
                  Valor total da cobrança
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150.00"
                  className={`${fieldClassName} [&>option]:bg-zinc-950 [&>option]:text-zinc-100`} style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-200">
                  Vencimento
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`${fieldClassName} [&>option]:bg-zinc-950 [&>option]:text-zinc-100`} style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-200">
                  Vencimento
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`${fieldClassName} [&>option]:bg-zinc-950 [&>option]:text-zinc-100`} style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-200">
                  Mensagem opcional
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Ex.: honorários referentes ao atendimento e análise do caso."
                  className={`${fieldClassName} min-h-[116px] resize-y`} style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
                <label className="flex items-center gap-3 text-sm font-medium text-zinc-200">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  Gerar pagamento recorrente
                </label>

                {isRecurring ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-200">
                          Quantidade de parcelas
                        </label>
                        <input
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          className={fieldClassName}
                          style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                          required={isRecurring}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-zinc-200">
                          Dia da cobrança mensal
                        </label>
                        <input
                          value={chargeDay}
                          onChange={(e) => setChargeDay(e.target.value)}
                          className={fieldClassName}
                          style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                          required={isRecurring}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-3 text-sm font-medium text-zinc-200">
                      <input
                        type="checkbox"
                        checked={hasInterest}
                        onChange={(e) => setHasInterest(e.target.checked)}
                      />
                      Aplicar juros
                    </label>

                    {hasInterest ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-200">
                            Percentual de juros
                          </label>
                          <input
                            value={interestPercent}
                            onChange={(e) => setInterestPercent(e.target.value)}
                            placeholder="Ex.: 10"
                            className={fieldClassName}
                            style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                            required={hasInterest}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-200">
                            Juros a partir da parcela
                          </label>
                          <input
                            value={interestStartsAtInstallment}
                            onChange={(e) => setInterestStartsAtInstallment(e.target.value)}
                            placeholder="Ex.: 3"
                            className={fieldClassName}
                            style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                            required={hasInterest}
                          />
                        </div>
                      </div>
                    ) : null}

                    {recurringPreview ? (
                      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                          Resumo da recorrência
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Valor total
                            </div>
                            <div className="text-sm font-semibold text-white">
                              {formatCurrency(recurringPreview.total)}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                            <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Parcela inicial
                            </div>
                            <div className="text-sm font-semibold text-white">
                              {formatCurrency(recurringPreview.firstInstallmentValue)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-sm text-zinc-300">
                          {recurringPreview.totalInstallments} parcela(s) no total.
                          {recurringPreview.lastBaseInstallmentValue !== recurringPreview.firstInstallmentValue ? (
                            <> A última parcela pode ajustar centavos automaticamente.</>
                          ) : null}
                        </div>

                        {recurringPreview.hasInterest ? (
                          <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                            Parcela com juros: <strong>{formatCurrency(recurringPreview.installmentWithInterest)}</strong>
                            {recurringPreview.interestStart ? (
                              <> a partir da parcela {recurringPreview.interestStart}.</>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Enviando..." : isRecurring ? "Criar cobrança recorrente" : "Criar e enviar cobrança"}
              </button>
            </div>
          </form>

          <section className={sectionCardClassName}>
            <div className="mb-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Cobranças recentes</h2>
                  <p className="text-sm text-zinc-400">
                    Histórico operacional da advocacia.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-300">
                  {filteredCharges.length} resultado(s)
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por cliente, e-mail, telefone ou processo"
                  className={`${fieldClassName} [&>option]:bg-zinc-950 [&>option]:text-zinc-100`} style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`${fieldClassName} [&>option]:bg-zinc-950 [&>option]:text-zinc-100`} style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                >
                  <option value="ALL">Todos os status</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="PAID">Pagas</option>
                  <option value="CANCELLED">Canceladas</option>
                  <option value="EXPIRED">Expiradas</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 text-sm text-zinc-300">
                Carregando cobranças...
              </div>
            ) : filteredCharges.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/50 p-8 text-center text-sm text-zinc-400">
                Nenhuma cobrança encontrada com os filtros atuais.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCharges.map((charge) => {
                  const whatsappLink = buildWhatsAppLink(charge);

                  return (
                    <article
                      key={charge.id}
                      className="rounded-3xl border border-white/10 bg-zinc-950/50 p-4 transition hover:border-white/15 hover:bg-zinc-950/60"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold text-white break-words">
                              {charge.client?.name || "Cliente"}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(charge.status)}`}
                            >
                              {statusLabel(charge.status)}
                            </span>
                          </div>

                          <div className="text-sm text-zinc-300">
                            Valor:{" "}
                            <span className="font-semibold text-white">
                              {formatCurrency(charge.amount)}
                            </span>
                          </div>

                          {(charge.process?.cnjNumber || charge.process?.cnj) ? (
                            <div className="text-sm text-zinc-400 break-words">
                              Processo: {charge.process?.cnjNumber || charge.process?.cnj}
                            </div>
                          ) : null}

                          <div className="grid gap-3 md:grid-cols-2">
                            {charge.emailTarget ? (
                              <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                  E-mail
                                </div>
                                <div className="text-sm text-zinc-300 break-all">
                                  {charge.emailTarget}
                                </div>
                              </div>
                            ) : null}

                            {charge.phoneTarget ? (
                              <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                                <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                  Telefone
                                </div>
                                <div className="text-sm text-zinc-300 break-all">
                                  {charge.phoneTarget}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {charge.emailSentAt ? (
                              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                                E-mail enviado
                              </div>
                            ) : null}
                          </div>

                          {charge.message ? (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300 break-words">
                              {charge.message}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex w-full flex-wrap gap-2 xl:w-auto xl:max-w-[340px] xl:justify-end">
                          {charge.paymentUrl && charge.status !== "CANCELLED" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(charge.paymentUrl)}
                                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
                              >
                                Copiar link
                              </button>

                              <a
                                href={charge.paymentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
                              >
                                Abrir cobrança
                              </a>
                            </>
                          ) : null}

                          {whatsappLink ? (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                            >
                              Enviar por WhatsApp
                            </a>
                          ) : null}

                          {charge.status !== "PAID" && charge.status !== "CANCELLED" ? (
                            <button
                              type="button"
                              onClick={() => handleCancelCharge(charge.id)}
                              disabled={cancelingId === charge.id}
                              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {cancelingId === charge.id ? "Cancelando..." : "Cancelar cobrança"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>
    </AdminShell>
  );
}