import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "SUPERADMIN") redirect("/admin");

  const config = await prisma.systemConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", maxClients: 50 },
  });

  const activeClients = await prisma.client.count({ where: { archived: false } });

  async function save(formData: FormData) {
    "use server";
    const raw = (formData.get("maxClients") ?? "").toString().trim();
    const maxClients = Number(raw);

    if (!Number.isFinite(maxClients) || maxClients < 1 || maxClients > 100000) {
      return;
    }

    await prisma.systemConfig.upsert({
      where: { id: "global" },
      update: { maxClients },
      create: { id: "global", maxClients },
    });
  }

  return (
    <AdminShell userName={user.name} role={user.role}>
      <h1 style={{ marginTop: 0 }}>Configurações</h1>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Limite de clientes ativos</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          Clientes arquivados não contam. Ativos agora: <b>{activeClients}</b>
        </div>

        <form action={save} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            name="maxClients"
            type="number"
            min={1}
            max={100000}
            defaultValue={config.maxClients}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", width: 180 }}
          />

          <button
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Salvar
          </button>
        </form>

        <div style={{ marginTop: 14, fontSize: 12, color: "#6b7280" }}>
          Quando o limite for atingido, o sistema bloqueia a criação de novos clientes.
        </div>
      </div>
    </AdminShell>
  );
}
