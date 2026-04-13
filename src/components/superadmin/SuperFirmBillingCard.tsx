"use client";

import { useCallback, useEffect, useState } from "react";

type GatewayData = {
  id?: string;
  firmId?: string;
  provider?: string;
  isActive?: boolean;
  enabledBySuperadmin?: boolean;
  hasAccessToken?: boolean;
  hasPublicKey?: boolean;
  createdAt?: string;
  updatedAt?: string;
} | null;

type Props = {
  firmId: string;
};

export default function SuperFirmBillingCard({ firmId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<GatewayData>(null);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await fetch(`/api/super/firms/${firmId}/billing/gateway`, {
        cache: "no-store",
      });

      const json = await response.json();

      if (!json?.ok) {
        throw new Error(json?.message || "Falha ao carregar billing.");
      }

      setData(json.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar billing.");
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const response = await fetch(`/api/super/firms/${firmId}/billing/gateway`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken,
          publicKey,
        }),
      });

      const json = await response.json();

      if (!json?.ok) {
        throw new Error(json?.message || "Falha ao salvar configuração.");
      }

      setMessage(json.message || "Gateway configurado com sucesso.");
      setAccessToken("");
      setPublicKey("");
      await loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(nextActive: boolean) {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const response = await fetch(`/api/super/firms/${firmId}/billing/gateway`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextActive,
        }),
      });

      const json = await response.json();

      if (!json?.ok) {
        throw new Error(json?.message || "Falha ao atualizar status do gateway.");
      }

      setMessage(json.message || "Status atualizado.");
      await loadConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Cobranças / Mercado Pago</h2>
          <p className="text-sm text-zinc-400">
            Controle premium do gateway financeiro desta advocacia.
          </p>
        </div>

        {data ? (
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              data.isActive
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-yellow-500/20 text-yellow-300"
            }`}
          >
            {data.isActive ? "Ativo" : "Inativo"}
          </span>
        ) : (
          <span className="inline-flex w-fit rounded-full bg-zinc-500/20 px-3 py-1 text-xs font-semibold text-zinc-300">
            Não configurado
          </span>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
          Carregando configuração financeira...
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Provider</div>
              <div className="mt-2 text-sm font-medium text-white">
                {data?.provider ?? "Mercado Pago"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Access Token</div>
              <div className="mt-2 text-sm font-medium text-white">
                {data?.hasAccessToken ? "Configurado" : "Não configurado"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Public Key</div>
              <div className="mt-2 text-sm font-medium text-white">
                {data?.hasPublicKey ? "Configurada" : "Opcional / ausente"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Liberação premium</div>
              <div className="mt-2 text-sm font-medium text-white">
                {data?.enabledBySuperadmin ? "Liberado" : "Não liberado"}
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {message}
            </div>
          ) : null}

          <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-200">
                Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="APP_USR-..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none ring-0 transition placeholder:text-zinc-500 focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-200">
                Public Key (opcional)
              </label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="APP_USR-..."
                className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-white outline-none ring-0 transition placeholder:text-zinc-500 focus:border-violet-500/50"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando..." : data ? "Atualizar gateway" : "Conectar gateway"}
              </button>

              {data ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleToggle(!data.isActive)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {data.isActive ? "Desativar cobrança" : "Ativar cobrança"}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}