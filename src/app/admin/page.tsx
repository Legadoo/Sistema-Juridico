import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminShell } from "@/components/AdminShell";
import { redirect } from "next/navigation";

export default async function AdminHome() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [clients, processes, pendingDeadlines, nextDeadlines] = await Promise.all([
    prisma.client.count({ where: { archived: false } }),
    prisma.legalProcess.count({ where: { archived: false } }),
    prisma.deadline.count({ where: { done: false } }),
    prisma.deadline.findMany({
      where: { done: false },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: { process: { include: { client: true } } },
    }),
  ]);

  const Card = ({ title, value }: { title: string; value: number }) => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16,
        minHeight: 90,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>
        {title}
      </span>
      <span style={{ fontSize: 32, fontWeight: 900, color: "#111827" }}>
        {value}
      </span>
    </div>
  );

  const fmt = (d: Date) => {
    try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
  };

  return (
    <AdminShell userName={user.name} role={user.role}>
      <h1
        style={{
          marginTop: 0,
          marginBottom: 18,
          fontSize: 32,
          fontWeight: 900,
          color: "#111827",
        }}
      >
        Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card title="Clientes ativos" value={clients} />
        <Card title="Processos ativos" value={processes} />
        <Card title="Prazos pendentes" value={pendingDeadlines} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 10,
              fontSize: 18,
              fontWeight: 800,
              color: "#111827",
            }}
          >
            Próximos passos
          </h2>

          <ol
            style={{
              margin: 0,
              paddingLeft: 20,
              color: "#374151",
              lineHeight: 1.6,
              fontSize: 14,
            }}
          >
            <li>Cadastre 1 cliente e 1 processo para testar.</li>
            <li>Adicione 2 atualizações (uma visível e uma interna).</li>
            <li>Abra a página do cliente e teste CPF/CNPJ + código.</li>
          </ol>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 10,
              fontSize: 18,
              fontWeight: 800,
              color: "#111827",
            }}
          >
            Prazos mais próximos
          </h2>

          {nextDeadlines.length === 0 ? (
            <div style={{ color: "#6b7280", fontSize: 14 }}>Nenhum prazo pendente.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {nextDeadlines.map((d) => (
                <div key={d.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 900, color: "#111827" }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Vence: {fmt(d.dueDate)} — {d.process.client.name} ({d.process.client.document}) — CNJ {d.process.cnj}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
