"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SuperAdminShell from "@/components/SuperAdminShell";
import { fetchMeOrRedirect } from "@/lib/superadmin/clientGuard";

type FirmItem = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  maxClients: number;
  usersCount: number;
  clientsCount: number;
  processesCount: number;
  usagePercent?: number;
  nearLimit?: boolean;

  moduleDashboard: boolean;
  moduleClients: boolean;
  moduleProcesses: boolean;
  moduleDeadlines: boolean;
  moduleAppointments: boolean;
  moduleAvailability: boolean;
  moduleUsers: boolean;
  moduleCharges: boolean;

  gatewayConfigured: boolean;
  gatewayActive: boolean;
  gatewayEnabledBySuperadmin: boolean;
  gatewayProvider?: string;
};

type FirmForm = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  maxClients: string;

  moduleDashboard: boolean;
  moduleClients: boolean;
  moduleProcesses: boolean;
  moduleDeadlines: boolean;
  moduleAppointments: boolean;
  moduleAvailability: boolean;
  moduleUsers: boolean;
  moduleCharges: boolean;

  accessToken: string;
  publicKey: string;
};

const emptyForm: FirmForm = {
  id: "",
  name: "",
  slug: "",
  active: true,
  maxClients: "50",

  moduleDashboard: true,
  moduleClients: true,
  moduleProcesses: true,
  moduleDeadlines: true,
  moduleAppointments: true,
  moduleAvailability: true,
  moduleUsers: true,
  moduleCharges: true,

  accessToken: "",
  publicKey: "",
};

const moduleItems: Array<{
  key:
    | "moduleDashboard"
    | "moduleClients"
    | "moduleProcesses"
    | "moduleDeadlines"
    | "moduleAppointments"
    | "moduleAvailability"
    | "moduleUsers"
    | "moduleCharges";
  label: string;
  desc: string;
}> = [
  { key: "moduleDashboard", label: "Dashboard", desc: "Visão geral da advocacia." },
  { key: "moduleClients", label: "Clientes", desc: "Cadastro e gestão de clientes." },
  { key: "moduleProcesses", label: "Processos", desc: "Controle de processos jurídicos." },
  { key: "moduleDeadlines", label: "Prazos", desc: "Controle de prazos e tarefas." },
  { key: "moduleAppointments", label: "Agendamentos", desc: "Agenda interna e pública." },
  { key: "moduleAvailability", label: "Disponibilidade", desc: "Horários públicos para cliente." },
  { key: "moduleUsers", label: "Usuários", desc: "Equipe da advocacia." },
  { key: "moduleCharges", label: "Cobranças", desc: "Módulo financeiro e Mercado Pago." },
];

function slugifyText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function firmStatusColor(firm: FirmItem) {
  if (!firm.active) return "#FCA5A5";
  if (firm.nearLimit) return "#FDE68A";
  return "#A7F3D0";
}

function firmStatusText(firm: FirmItem) {
  if (!firm.active) return "INATIVA";
  if (firm.nearLimit) return "PERTO DO LIMITE";
  return "ATIVA";
}

export default function SuperadminFirmsPage() {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [firms, setFirms] = useState<FirmItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFirm, setSavingFirm] = useState(false);
  const [savingGateway, setSavingGateway] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [form, setForm] = useState<FirmForm>(emptyForm);

  const selectedFirm = useMemo(
    () => firms.find((firm) => firm.id === form.id) ?? null,
    [firms, form.id]
  );

  const filteredFirms = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return firms;

    return firms.filter((firm) =>
      [firm.name, firm.slug, firm.active ? "ativa" : "inativa", firm.gatewayActive ? "mercado pago ativo" : "mercado pago inativo"]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [firms, search]);

  const counts = useMemo(() => {
    return {
      total: firms.length,
      active: firms.filter((firm) => firm.active).length,
      inactive: firms.filter((firm) => !firm.active).length,
      gateway: firms.filter((firm) => firm.gatewayActive).length,
    };
  }, [firms]);

  function showMessage(text: string, tone: "success" | "error" | "info" = "info") {
    setMessage(text);
    setMessageTone(tone);
  }

  async function loadFirms() {
    setLoading(true);

    try {
      const response = await fetch("/api/super/firms", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showMessage(data?.message || "Não foi possível carregar as advocacias.", "error");
        setFirms([]);
        return;
      }

      setFirms(Array.isArray(data.firms) ? data.firms : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function boot() {
      const meResult = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!meResult) return;

      if (!ignore) {
        await loadFirms();
      }
    }

    void boot();

    return () => {
      ignore = true;
    };
  }, []);

  function resetCreate() {
    setMode("CREATE");
    setForm(emptyForm);
    setMessage("");
  }

  function openFirm(firm: FirmItem) {
    setMode("EDIT");
    setMessage("");
    setForm({
      id: firm.id,
      name: firm.name,
      slug: firm.slug,
      active: firm.active,
      maxClients: String(firm.maxClients || 50),

      moduleDashboard: firm.moduleDashboard,
      moduleClients: firm.moduleClients,
      moduleProcesses: firm.moduleProcesses,
      moduleDeadlines: firm.moduleDeadlines,
      moduleAppointments: firm.moduleAppointments,
      moduleAvailability: firm.moduleAvailability,
      moduleUsers: firm.moduleUsers,
      moduleCharges: firm.moduleCharges,

      accessToken: "",
      publicKey: "",
    });
  }

  function updateForm<K extends keyof FirmForm>(key: K, value: FirmForm[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveFirm() {
    if (!form.name.trim()) {
      showMessage("Informe o nome da advocacia.", "error");
      return;
    }

    setSavingFirm(true);
    setMessage("");

    try {
      const endpoint =
        mode === "CREATE"
          ? "/api/super/firms"
          : `/api/super/firms/${form.id}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim() || slugifyText(form.name),
          active: form.active,
          maxClients: Number(form.maxClients),

          moduleDashboard: form.moduleDashboard,
          moduleClients: form.moduleClients,
          moduleProcesses: form.moduleProcesses,
          moduleDeadlines: form.moduleDeadlines,
          moduleAppointments: form.moduleAppointments,
          moduleAvailability: form.moduleAvailability,
          moduleUsers: form.moduleUsers,
          moduleCharges: form.moduleCharges,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showMessage(data?.message || "Não foi possível salvar a advocacia.", "error");
        return;
      }

      showMessage(data?.message || "Advocacia salva com sucesso.", "success");

      await loadFirms();

      if (mode === "CREATE") {
        setForm(emptyForm);
      }
    } catch {
      showMessage("Falha ao salvar advocacia.", "error");
    } finally {
      setSavingFirm(false);
    }
  }

  async function saveGateway() {
    if (!selectedFirm) {
      showMessage("Selecione uma advocacia primeiro.", "error");
      return;
    }

    if (!form.accessToken.trim()) {
      showMessage("Informe o Access Token do Mercado Pago.", "error");
      return;
    }

    setSavingGateway(true);
    setMessage("");

    try {
      const response = await fetch(`/api/super/firms/${selectedFirm.id}/billing/gateway`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: form.accessToken.trim(),
          publicKey: form.publicKey.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showMessage(data?.message || "Não foi possível configurar o Mercado Pago.", "error");
        return;
      }

      showMessage(data?.message || "Mercado Pago configurado com sucesso.", "success");

      setForm((prev) => ({
        ...prev,
        accessToken: "",
        publicKey: "",
      }));

      await loadFirms();
    } catch {
      showMessage("Falha ao configurar Mercado Pago.", "error");
    } finally {
      setSavingGateway(false);
    }
  }

  async function toggleGateway() {
    if (!selectedFirm) {
      showMessage("Selecione uma advocacia primeiro.", "error");
      return;
    }

    setSavingGateway(true);
    setMessage("");

    try {
      const response = await fetch(`/api/super/firms/${selectedFirm.id}/billing/gateway`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !selectedFirm.gatewayActive,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        showMessage(data?.message || "Não foi possível alterar o Mercado Pago.", "error");
        return;
      }

      showMessage(data?.message || "Status do Mercado Pago atualizado.", "success");
      await loadFirms();
    } catch {
      showMessage("Falha ao alterar Mercado Pago.", "error");
    } finally {
      setSavingGateway(false);
    }
  }

  if (!me) {
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
        Carregando advocacias...
      </div>
    );
  }

  return (
    <SuperAdminShell userName={me.name}>
      <div className="jv-firms-module">
        <style>{`
          .jv-firms-module {
            display: grid;
            gap: 20px;
          }

          .jv-firms-header {
            padding: 24px;
            border-radius: 24px;
          }

          .jv-firms-title {
            color: #F8FAFC;
            font-size: 30px;
            font-weight: 950;
            letter-spacing: -0.04em;
          }

          .jv-firms-subtitle {
            color: #94A3B8;
            margin-top: 6px;
            line-height: 1.7;
          }

          .jv-firms-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
          }

          .jv-firms-card {
            padding: 16px;
            border-radius: 20px;
          }

          .jv-firms-grid {
            display: grid;
            grid-template-columns: minmax(340px, 1.05fr) minmax(420px, 0.95fr);
            gap: 20px;
            align-items: start;
          }

          .jv-firms-list,
          .jv-firms-editor {
            display: grid;
            gap: 14px;
          }

          .jv-firms-panel {
            padding: 18px;
            border-radius: 20px;
          }

          .jv-firm-item {
            padding: 18px;
            border-radius: 20px;
            display: grid;
            gap: 10px;
            cursor: pointer;
            text-align: left;
          }

          .jv-firms-two {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .jv-firms-field {
            display: grid;
            gap: 6px;
          }

          .jv-firms-label {
            color: #CBD5E1;
            font-size: 13px;
            font-weight: 800;
          }

          .jv-firms-check {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            color: #E2E8F0;
            padding: 12px 14px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.03);
          }

          .jv-firms-check small {
            display: block;
            color: #94A3B8;
            margin-top: 4px;
            line-height: 1.45;
          }

          .jv-firms-modules {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .jv-firms-message {
            padding: 12px 14px;
            border-radius: 14px;
            line-height: 1.6;
            font-size: 14px;
          }

          .jv-firms-success {
            border: 1px solid rgba(52,211,153,0.24);
            background: rgba(6,78,59,0.18);
            color: #A7F3D0;
          }

          .jv-firms-error {
            border: 1px solid rgba(248,113,113,0.26);
            background: rgba(127,29,29,0.18);
            color: #FECACA;
          }

          .jv-firms-info {
            border: 1px solid rgba(56,189,248,0.22);
            background: rgba(14,116,144,0.12);
            color: #BAE6FD;
          }

          .jv-firms-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .jv-firms-secondary-btn {
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.04);
            color: #E2E8F0;
            border-radius: 14px;
            padding: 11px 15px;
            font-weight: 900;
            text-decoration: none;
            cursor: pointer;
          }

          .jv-firms-warning {
            color: #FDE68A;
          }

          @media (max-width: 1100px) {
            .jv-firms-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 720px) {
            .jv-firms-two,
            .jv-firms-modules {
              grid-template-columns: 1fr;
            }

            .jv-firms-title {
              font-size: 25px;
            }
          }
        `}</style>

        <section className="jv-glass jv-firms-header">
          <div className="jv-firms-title">Advocacias</div>
          <div className="jv-firms-subtitle">
            Controle completo das advocacias do sistema. Crie, edite, limite clientes,
            libere módulos e configure o Mercado Pago de cada escritório.
          </div>
        </section>

        <section className="jv-firms-cards">
          <div className="jv-premium-card jv-firms-card">
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>Total</div>
            <div style={{ color: "#F8FAFC", fontSize: 28, fontWeight: 950 }}>{counts.total}</div>
          </div>

          <div className="jv-premium-card jv-firms-card">
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>Ativas</div>
            <div style={{ color: "#A7F3D0", fontSize: 28, fontWeight: 950 }}>{counts.active}</div>
          </div>

          <div className="jv-premium-card jv-firms-card">
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>Inativas</div>
            <div style={{ color: "#FCA5A5", fontSize: 28, fontWeight: 950 }}>{counts.inactive}</div>
          </div>

          <div className="jv-premium-card jv-firms-card">
            <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>Mercado Pago ativo</div>
            <div style={{ color: "#BAE6FD", fontSize: 28, fontWeight: 950 }}>{counts.gateway}</div>
          </div>
        </section>

        {message ? (
          <div
            className={
              messageTone === "success"
                ? "jv-firms-message jv-firms-success"
                : messageTone === "error"
                  ? "jv-firms-message jv-firms-error"
                  : "jv-firms-message jv-firms-info"
            }
          >
            {message}
          </div>
        ) : null}

        <div className="jv-firms-grid">
          <section className="jv-firms-list">
            <div className="jv-glass jv-firms-panel">
              <div style={{ color: "#F8FAFC", fontWeight: 900, fontSize: 17 }}>
                Buscar advocacia
              </div>

              <input
                className="jv-premium-input"
                placeholder="Pesquisar por nome, slug, status ou Mercado Pago..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div style={{ color: "#94A3B8", fontSize: 13 }}>
                Resultados: {filteredFirms.length}
              </div>

              <button type="button" className="jv-premium-btn" onClick={resetCreate}>
                Criar nova advocacia
              </button>
            </div>

            {loading ? (
              <div className="jv-glass jv-firms-panel">Carregando advocacias...</div>
            ) : filteredFirms.length === 0 ? (
              <div className="jv-glass jv-firms-panel">Nenhuma advocacia encontrada.</div>
            ) : (
              filteredFirms.map((firm) => (
                <button
                  key={firm.id}
                  type="button"
                  onClick={() => openFirm(firm)}
                  className="jv-glass jv-firm-item"
                  style={{
                    border:
                      mode === "EDIT" && form.id === firm.id
                        ? "1px solid rgba(99,102,241,0.55)"
                        : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ color: "#F8FAFC", fontSize: 20, fontWeight: 900 }}>
                      {firm.name}
                    </div>

                    <div style={{ color: firmStatusColor(firm), fontWeight: 950, fontSize: 12 }}>
                      {firmStatusText(firm)}
                    </div>
                  </div>

                  <div style={{ color: "#94A3B8" }}>slug: {firm.slug}</div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                    <div style={{ color: "#CBD5E1" }}>Usuários: {firm.usersCount}</div>
                    <div style={{ color: "#CBD5E1" }}>Clientes: {firm.clientsCount}/{firm.maxClients}</div>
                    <div style={{ color: "#CBD5E1" }}>Processos: {firm.processesCount}</div>
                  </div>

                  <div style={{ color: firm.gatewayActive ? "#A7F3D0" : "#94A3B8", fontSize: 13, fontWeight: 800 }}>
                    Mercado Pago: {firm.gatewayActive ? "Ativo" : firm.gatewayConfigured ? "Configurado/inativo" : "Não configurado"}
                  </div>
                </button>
              ))
            )}
          </section>

          <section className="jv-glass jv-firms-editor jv-firms-panel">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#F8FAFC", fontSize: 23, fontWeight: 950 }}>
                  {mode === "CREATE" ? "Criar advocacia" : "Editar advocacia"}
                </div>
                <div style={{ color: "#94A3B8", marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
                  Configure todos os detalhes operacionais da advocacia.
                </div>
              </div>

              {mode === "EDIT" ? (
                <button type="button" className="jv-firms-secondary-btn" onClick={resetCreate}>
                  Novo
                </button>
              ) : null}
            </div>

            <div className="jv-firms-two">
              <div className="jv-firms-field">
                <label className="jv-firms-label">Nome da advocacia</label>
                <input
                  className="jv-premium-input"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      name,
                      slug: mode === "CREATE" ? slugifyText(name) : prev.slug,
                    }));
                  }}
                  placeholder="Ex: Vasconcelos Advocacia"
                />
              </div>

              <div className="jv-firms-field">
                <label className="jv-firms-label">Slug</label>
                <input
                  className="jv-premium-input"
                  value={form.slug}
                  onChange={(e) => updateForm("slug", slugifyText(e.target.value))}
                  placeholder="vasconcelos-advocacia"
                />
              </div>
            </div>

            <div className="jv-firms-two">
              <div className="jv-firms-field">
                <label className="jv-firms-label">Limite de clientes</label>
                <input
                  className="jv-premium-input"
                  type="number"
                  min="1"
                  max="100000"
                  value={form.maxClients}
                  onChange={(e) => updateForm("maxClients", e.target.value)}
                />
              </div>

              <label className="jv-firms-check" style={{ alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => updateForm("active", e.target.checked)}
                />
                <div>
                  Advocacia ativa
                  <small>Se desativar, os usuários vinculados perdem o acesso.</small>
                </div>
              </label>
            </div>

            <div style={{ color: "#F8FAFC", fontSize: 18, fontWeight: 900 }}>
              Módulos liberados
            </div>

            <div className="jv-firms-modules">
              {moduleItems.map((item) => (
                <label className="jv-firms-check" key={item.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(form[item.key])}
                    onChange={(e) => updateForm(item.key, e.target.checked)}
                  />
                  <div>
                    {item.label}
                    <small>{item.desc}</small>
                  </div>
                </label>
              ))}
            </div>

            <div className="jv-firms-actions">
              <button
                type="button"
                className="jv-premium-btn"
                disabled={savingFirm}
                onClick={saveFirm}
              >
                {savingFirm
                  ? "Salvando..."
                  : mode === "CREATE"
                    ? "Criar advocacia"
                    : "Salvar advocacia"}
              </button>

              {selectedFirm ? (
                <>
                  <Link className="jv-firms-secondary-btn" href={`/admin/super/firms/${selectedFirm.id}`}>
                    Gerenciar detalhes
                  </Link>

                  <Link className="jv-firms-secondary-btn" href={`/admin/super/firms/${selectedFirm.id}/clients`}>
                    Ver clientes
                  </Link>

                  <Link className="jv-firms-secondary-btn" href={`/admin/super/firms/${selectedFirm.id}/processes`}>
                    Ver processos
                  </Link>
                </>
              ) : null}
            </div>

            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.08)",
                margin: "6px 0",
              }}
            />

            <div>
              <div style={{ color: "#F8FAFC", fontSize: 20, fontWeight: 950 }}>
                Mercado Pago da advocacia
              </div>

              <div style={{ color: "#94A3B8", marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
                Configure o Access Token da advocacia selecionada. O token não será exibido depois de salvo.
              </div>
            </div>

            {!selectedFirm ? (
              <div className="jv-firms-message jv-firms-info">
                Crie ou selecione uma advocacia para configurar o Mercado Pago.
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                  <div className="jv-premium-card jv-firms-card">
                    <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>Provider</div>
                    <div style={{ color: "#F8FAFC", fontWeight: 900 }}>
                      {selectedFirm.gatewayProvider || "MERCADO_PAGO"}
                    </div>
                  </div>

                  <div className="jv-premium-card jv-firms-card">
                    <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>Configuração</div>
                    <div style={{ color: selectedFirm.gatewayConfigured ? "#A7F3D0" : "#FCA5A5", fontWeight: 900 }}>
                      {selectedFirm.gatewayConfigured ? "Configurado" : "Ausente"}
                    </div>
                  </div>

                  <div className="jv-premium-card jv-firms-card">
                    <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 900 }}>Status</div>
                    <div style={{ color: selectedFirm.gatewayActive ? "#A7F3D0" : "#FDE68A", fontWeight: 900 }}>
                      {selectedFirm.gatewayActive ? "Ativo" : "Inativo"}
                    </div>
                  </div>
                </div>

                <div className="jv-firms-two">
                  <div className="jv-firms-field">
                    <label className="jv-firms-label">Access Token</label>
                    <input
                      className="jv-premium-input"
                      type="password"
                      value={form.accessToken}
                      onChange={(e) => updateForm("accessToken", e.target.value)}
                      placeholder="APP_USR-..."
                    />
                  </div>

                  <div className="jv-firms-field">
                    <label className="jv-firms-label">Public Key opcional</label>
                    <input
                      className="jv-premium-input"
                      value={form.publicKey}
                      onChange={(e) => updateForm("publicKey", e.target.value)}
                      placeholder="APP_USR-..."
                    />
                  </div>
                </div>

                <div className="jv-firms-actions">
                  <button
                    type="button"
                    className="jv-premium-btn"
                    disabled={savingGateway}
                    onClick={saveGateway}
                  >
                    {savingGateway ? "Salvando..." : selectedFirm.gatewayConfigured ? "Atualizar Mercado Pago" : "Conectar Mercado Pago"}
                  </button>

                  {selectedFirm.gatewayConfigured ? (
                    <button
                      type="button"
                      className="jv-firms-secondary-btn"
                      disabled={savingGateway}
                      onClick={toggleGateway}
                    >
                      {selectedFirm.gatewayActive ? "Desativar Mercado Pago" : "Ativar Mercado Pago"}
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </SuperAdminShell>
  );
}
