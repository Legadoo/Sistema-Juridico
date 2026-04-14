import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { cancelChargeForFirm } from "@/services/charge.service";

function ensureLawFirmUser(user: { role: string; firmId?: string | null }) {
  return user.role === "MASTER" || user.role === "SECRETARY";
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 },
      );
    }

    if (!ensureLawFirmUser(user) || !user.firmId) {
      return NextResponse.json(
        { ok: false, message: "Acesso negado." },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    const charge = await cancelChargeForFirm({
      firmId: user.firmId,
      chargeId: id,
    });

    return NextResponse.json({
      ok: true,
      data: charge,
      message: "Cobrança cancelada com sucesso.",
    });
  } catch (error) {
    console.error("POST cancel charge error:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Falha ao cancelar cobrança.",
      },
      { status: 500 },
    );
  }
}