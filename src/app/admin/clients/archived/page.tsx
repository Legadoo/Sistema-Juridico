"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";

type Me = { name: string; role: string };

type Client = {
  id: string;
  name: string;
  document: string;
};

export default function ArchivedClientsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  async function load() {
    const m = await fetch("/api/me").then(r => r.json()).catch(() => null);
    if (m?.ok) setMe({ name: m.user.name, role: m.user.role });

    const c = await fetch("/api/admin/clients/archived")
      .then(r => r.json())
      .catch(() => null);

    if (c?.ok) setClients(c.clients);
  }

  useEffect(() => {
    load();
  }, []);

  if (!me) return <div style={{ padding: 16 }}>Carregando...</div>;

  return (
    <AdminShell userName={me.name} role={me.role}>
      <h1>Clientes arquivados</h1>

      {clients.length === 0 && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
          Nenhum cliente arquivado.
        </div>
      )}

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {clients.map(c => (
          <div
            key={c.id}
            style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}
          >
            <div style={{ fontWeight: 700 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{c.document}</div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
