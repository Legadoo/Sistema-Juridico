import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { unarchiveClientForFirm } from "@/services/client.service";

export async function POST(req: Request) {
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
        { ok: false, message: "Sem permissão para desarquivar cliente." },
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