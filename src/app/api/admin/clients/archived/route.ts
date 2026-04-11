import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listArchivedClientsByFirm } from "@/services/client.service";

export async function GET() {
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
        { ok: false, message: "Sem permissão para visualizar clientes arquivados." },
        { status: 403 }
      );
    }

    const clients = await listArchivedClientsByFirm(user.firmId);

    return NextResponse.json({
      ok: true,
      clients,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao listar clientes arquivados.";

    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}