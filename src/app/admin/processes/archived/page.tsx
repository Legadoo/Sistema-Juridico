import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { AdminShell } from "@/components/AdminShell";

export default async function ArchivedProcessesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const allowed = user.role === "MASTER" || user.role === "SUPERADMIN" || user.role === "SECRETARY";
  if (!allowed) redirect("/login");

  const canUnarchive = user.role === "MASTER" || user.role === "SUPERADMIN";

  const processes = await prisma.legalProcess.findMany({
    where: { archived: true },
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  async function unarchiveProcess(formData: FormData) {
    "use server";
    const processId = (formData.get("processId") ?? "").toString().trim();
    if (!processId) return;

    await prisma.legalProcess.update({
      where: { id: processId },
      data: { archived: false },
    });

    // Não precisa redirect; ao reenviar/voltar, a lista já vem atualizada
  }

  return (
    <AdminShell userName={user.name} role={user.role}>
      <h1>Processos arquivados</h1>

      {processes.length === 0 ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
          Nenhum processo arquivado.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {processes.map((p) => (
            <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{(p.notes && p.notes.trim()) ? p.notes : "Processo"}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>CNJ: {p.cnj}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    Cliente: {p.client?.name} ({p.client?.document})
                  </div>
                </div>

                {canUnarchive && (
                  <form action={unarchiveProcess}>
                    <input type="hidden" name="processId" value={p.id} />
                    <button
                      style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Desarquivar
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
