import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import { unarchiveClientForFirm } from "@/services/client.service";

function canArchive(role: string) {
  return role === "MASTER" || role === "SUPERADMIN";
}

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

    if (!canArchive(user.role)) {
      return NextResponse.json(
        { ok: false, message: "Apenas advogado pode desarquivar cliente." },
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

    await unarchiveClientForFirm(clientId, user.firmId);

    return NextResponse.json({
      ok: true,
      message: "Cliente desarquivado com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao desarquivar cliente.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}