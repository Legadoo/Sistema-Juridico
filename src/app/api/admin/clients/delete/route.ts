import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import { deleteClientForFirm } from "@/services/client.service";

export async function POST(req: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleClients");
  if (moduleGuard) return moduleGuard;
  try {
    const user = await getSessionUser();

    if (!user || !user.firmId) {
      return NextResponse.json(
        { ok: false, message: "Não autorizado." },
        { status: 401 }
      );
    }

    if (user.role !== "MASTER") {
      return NextResponse.json(
        { ok: false, message: "Apenas MASTER pode excluir cliente." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const clientId = (body?.clientId ?? "").toString().trim();

    if (!clientId) {
      return NextResponse.json(
        { ok: false, message: "clientId obrigatório." },
        { status: 400 }
      );
    }

    await deleteClientForFirm(clientId, user.firmId);

    return NextResponse.json({
      ok: true,
      message: "Cliente excluído com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao excluir cliente.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}