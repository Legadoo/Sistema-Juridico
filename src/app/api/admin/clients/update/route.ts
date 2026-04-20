import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import { updateClientForFirm } from "@/services/client.service";

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

    if (user.role !== "MASTER" && user.role !== "SECRETARY") {
      return NextResponse.json(
        { ok: false, message: "Sem permissão para editar cliente." },
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

    const client = await updateClientForFirm(clientId, user.firmId, {
      name: body?.name,
      document: body?.document,
      phone: body?.phone,
      email: body?.email,
      accessCode: body?.accessCode,
    });

    return NextResponse.json({
      ok: true,
      client,
      message: "Cliente atualizado com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar cliente.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}