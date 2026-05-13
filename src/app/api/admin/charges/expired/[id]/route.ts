import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import { deleteExpiredChargeForFirm } from "@/services/charge.service";

function ensureLawFirmUser(user: { role: string; firmId?: string | null }) {
  return user.role === "MASTER" || user.role === "SECRETARY";
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const moduleGuard = await ensureAdminModuleResponse("moduleCharges");
  if (moduleGuard) return moduleGuard;

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

    await deleteExpiredChargeForFirm({
      firmId: user.firmId,
      chargeId: id,
    });

    return NextResponse.json({
      ok: true,
      message: "Cobrança expirada excluída com segurança.",
    });
  } catch (error) {
    console.error("DELETE expired charge error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao excluir cobrança expirada.",
      },
      { status: 400 },
    );
  }
}