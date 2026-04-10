"use client";

import { useEffect, useState } from "react";
import SuperAdminShell from "@/components/SuperAdminShell";
import { fetchMeOrRedirect } from "@/lib/superadmin/clientGuard";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ClientItem = {
  id: string;
  name: string;
  document: string;
  phone?: string | null;
  email?: string | null;
  archived: boolean;
};

export default function SuperadminFirmClientsPage({ params }: PageProps) {
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [firmId, setFirmId] = useState("");
  const [firmName, setFirmName] = useState("Advocacia");
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [message, setMessage] = useState("");
  const [editingClientId, setEditingClientId] = useState("");
  const [savingClient, setSavingClient] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    let ignore = false;

    async function boot() {
      const resolved = await params;
      if (!ignore) setFirmId(resolved.id);
    }

    void boot();

    return () => {
      ignore = true;
    };
  }, [params]);

  async function loadClients(currentFirmId: string) {
    const res = await fetch(`/api/super/firms/${currentFirmId}/clients`, { cache: "no-store" });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }

    const data = await res.json().catch(() => null);

    if (data?.ok) {
      setFirmName(data.firm?.name ?? "Advocacia");
      setClients(data.clients ?? []);
    }
  }

  useEffect(() => {
    if (!firmId) return;

    let ignore = false;

    async function load() {
      const me = await fetchMeOrRedirect((value) => {
        if (!ignore) setMe(value);
      });

      if (!me) return;

      await loadClients(firmId);
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [firmId]);

  function startEdit(client: ClientItem) {
    setEditingClientId(client.id);
    setEditForm({
      name: client.name,
      document: client.document,
      email: client.email ?? "",
      phone: client.phone ?? "",
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditingClientId("");
    setEditForm({
      name: "",
      document: "",
      email: "",
      phone: "",
    });
  }

  async function saveClient() {
    if (!firmId || !editingClientId) return;

    setSavingClient(true);
    setMessage("");

    try {
      const res = await fetch(`/api/super/firms/${firmId}/clients/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: editingClientId,
          name: editForm.name,
          document: editForm.document,
          email: editForm.email,
          phone: editForm.phone,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMessage(data?.message ?? "Não foi possível atualizar o cliente.");
        return;
      }

      setClients((prev) =>
        prev.map((client) => (client.id === editingClientId ? data.client : client))
      );

      cancelEdit();
      setMessage("Cliente atualizado com sucesso.");
    } finally {
      setSavingClient(false);
    }
  }

  async function archiveClient(client: ClientItem) {
    if (!firmId) return;

    const endpoint = client.archived ? "unarchive" : "archive";

    const res = await fetch(`/api/super/firms/${firmId}/clients/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMessage(data?.message ?? "Não foi possível alterar o status do cliente.");
      return;
    }

    setClients((prev) =>
      prev.map((item) => (item.id === client.id ? data.client : item))
    );

    setMessage(`Cliente ${data.client.archived ? "arquivado" : "desarquivado"} com sucesso.`);
  }

  async function deleteClient(client: ClientItem) {
    if (!firmId) return;

    const confirmed = window.confirm(`Deseja realmente excluir o cliente "${client.name}"?`);
    if (!confirmed) return;

    const res = await fetch(`/api/super/firms/${firmId}/clients/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMessage(data?.message ?? "Não foi possível excluir o cliente.");
      return;
    }

    setClients((prev) => prev.filter((item) => item.id !== client.id));

    if (editingClientId === client.id) {
      cancelEdit();
    }

    setMessage("Cliente excluído com sucesso.");
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
        }}
      >
        Carregando clientes...
      </div>
    );
  }

  return (
    <SuperAdminShell userName={me.name}>
      <div style={{ display: "grid", gap: 24 }}>
        <section
          style={{
            borderRadius: 28,
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(15,23,42,0.92) 45%, rgba(99,102,241,0.10))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 24px 45px rgba(0,0,0,0.30)",
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                width: "fit-content",
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#CFFAFE",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              CLIENTES DA ADVOCACIA
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                color: "#F8FAFC",
              }}
            >
              {firmName}
            </h1>

            <p
              style={{
                margin: 0,
                color: "#94A3B8",
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              Operação completa dos clientes cadastrados neste escritório.
            </p>
          </div>
        </section>

        {message ? (
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: "rgba(99,102,241,0.10)",
              border: "1px solid rgba(99,102,241,0.18)",
              color: "#C7D2FE",
            }}
          >
            {message}
          </div>
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 0.95fr",
            gap: 18,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "grid",
              gap: 14,
            }}
          >
            {clients.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                }}
              >
                Nenhum cliente encontrado nesta advocacia.
              </div>
            ) : (
              clients.map((client) => (
                <div
                  key={client.id}
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: 18,
                    borderRadius: 18,
                    background: editingClientId === client.id ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.03)",
                    border: editingClientId === client.id
                      ? "1px solid rgba(99,102,241,0.25)"
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#F8FAFC" }}>
                        {client.name}
                      </div>
                      <div style={{ color: "#64748B", fontSize: 13 }}>
                        Documento: {client.document}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: client.archived
                          ? "rgba(239,68,68,0.12)"
                          : "rgba(16,185,129,0.12)",
                        color: client.archived ? "#FCA5A5" : "#6EE7B7",
                        border: client.archived
                          ? "1px solid rgba(239,68,68,0.18)"
                          : "1px solid rgba(16,185,129,0.18)",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {client.archived ? "Arquivado" : "Ativo"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Email</div>
                      <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{client.email || "Não informado"}</div>
                    </div>

                    <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ color: "#64748B", fontSize: 12, marginBottom: 6 }}>Telefone</div>
                      <div style={{ color: "#F8FAFC", fontWeight: 700 }}>{client.phone || "Não informado"}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="jv-premium-btn-secondary" onClick={() => startEdit(client)}>
                      Editar
                    </button>

                    <button className="jv-premium-btn-secondary" onClick={() => archiveClient(client)}>
                      {client.archived ? "Desarquivar" : "Arquivar"}
                    </button>

                    <button className="jv-premium-btn-secondary" onClick={() => deleteClient(client)}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(180deg, rgba(17,24,39,0.92), rgba(15,23,42,0.88))",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "grid",
              gap: 16,
              alignContent: "start",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F8FAFC" }}>
              Editar cliente
            </div>

            {!editingClientId ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                }}
              >
                Selecione um cliente da lista para editar.
              </div>
            ) : (
              <>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>Nome</span>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="jv-premium-input"
                    placeholder="Nome do cliente"
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>Documento</span>
                  <input
                    value={editForm.document}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, document: e.target.value }))}
                    className="jv-premium-input"
                    placeholder="CPF/CNPJ"
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>Email</span>
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="jv-premium-input"
                    placeholder="email@dominio.com"
                  />
                </label>

                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ color: "#94A3B8", fontSize: 13 }}>Telefone</span>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="jv-premium-input"
                    placeholder="Telefone"
                  />
                </label>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button className="jv-premium-btn" onClick={saveClient} disabled={savingClient}>
                    {savingClient ? "Salvando..." : "Salvar cliente"}
                  </button>

                  <button className="jv-premium-btn-secondary" onClick={cancelEdit} disabled={savingClient}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}