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
  message?: string | null;
  status: string;
  paymentUrl?: string | null;
  emailTarget?: string | null;
  phoneTarget?: string | null;
  createdAt: string;
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
      return "bg-emerald-500/20 text-emerald-300";
    case "CANCELLED":
      return "bg-red-500/20 text-red-300";
    case "EXPIRED":
      return "bg-yellow-500/20 text-yellow-300";
    default:
      return "bg-violet-500/20 text-violet-300";
  }
}

export default function ChargesPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [clientId, setClientId] = useState("");
  const [processId, setProcessId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

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

      const response = await fetch("/api/admin/charges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          processId: processId || null,
          amount: numericAmount,
          message: message.trim() || null,
        }),
      });

      const json = await response.json();

      if (!json?.ok) {
        throw new Error(json?.message || "Falha ao criar cobrança.");
      }

      setFeedback(json?.message || "Cobrança criada com sucesso.");
      setClientId("");
      setProcessId("");
      setAmount("");
      setMessage("");

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar cobrança.");
    } finally {
      setSubmitting(false);
    }
  }

  function buildWhatsAppLink(charge: ChargeItem) {
    const phone = (charge.phoneTarget || "").replace(/\D/g, "");
    if (!phone) return null;

    const text = [
      `Olá${charge.client?.name ? `, ${charge.client.name}` : ""}.`,
      `Segue sua cobrança no valor de ${formatCurrency(charge.amount)}.`,
      charge.message ? `${charge.message}` : null,
      charge.paymentUrl ? `Link para pagamento: ${charge.paymentUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

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
              Gere cobranças para seus clientes com o Mercado Pago sem sair do JuridicVas.
            </p>
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

        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={handleCreateCharge}
            className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl"
          >
            <h2 className="mb-4 text-lg font-semibold text-white">Nova cobrança</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-200">
                  Cliente
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none color-scheme-dark"
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
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-200">
                    E-mail identificado
                  </label>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    {selectedClient?.email || "Não informado"}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-200">
                    Telefone identificado
                  </label>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
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
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none color-scheme-dark"
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
                  Valor da cobrança
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150.00"
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
                  required
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
                  className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Enviando..." : "Enviar cobrança"}
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Cobranças recentes</h2>
                <p className="text-sm text-zinc-400">
                  Histórico operacional da advocacia.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                {charges.length} cobrança(s)
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                Carregando cobranças...
              </div>
            ) : charges.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-zinc-400">
                Nenhuma cobrança criada ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {charges.map((charge) => {
                  const whatsappLink = buildWhatsAppLink(charge);

                  return (
                    <article
                      key={charge.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-white">
                              {charge.client?.name || "Cliente"}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(charge.status)}`}
                            >
                              {statusLabel(charge.status)}
                            </span>
                          </div>

                          <div className="text-sm text-zinc-300">
                            Valor: <span className="font-semibold text-white">{formatCurrency(charge.amount)}</span>
                          </div>

                          {(charge.process?.cnjNumber || charge.process?.cnj) ? (
                            <div className="text-sm text-zinc-400">
                              Processo: {charge.process?.cnjNumber || charge.process?.cnj}
                            </div>
                          ) : null}

                          {charge.emailTarget ? (
                            <div className="text-sm text-zinc-400">
                              E-mail: {charge.emailTarget}
                            </div>
                          ) : null}

                          {charge.phoneTarget ? (
                            <div className="text-sm text-zinc-400">
                              Telefone: {charge.phoneTarget}
                            </div>
                          ) : null}

                          {charge.message ? (
                            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
                              {charge.message}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {charge.paymentUrl ? (
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