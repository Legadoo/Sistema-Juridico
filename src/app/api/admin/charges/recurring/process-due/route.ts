import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { processDueRecurringChargesForFirm } from "@/services/recurring-charge-processor.service";

export async function POST() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
    }

    if (!["MASTER", "SECRETARY", "SUPERADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Sem permissão." }, { status: 403 });
    }

    if (!user.firmId && user.role !== "SUPERADMIN") {
      return NextResponse.json({ ok: false, message: "Firma não encontrada." }, { status: 400 });
    }

    if (user.role === "SUPERADMIN") {
      return NextResponse.json(
        { ok: false, message: "Use um usuário vinculado à advocacia para processar recorrências por firma." },
        { status: 400 }
      );
    }

    const result = await processDueRecurringChargesForFirm(user.firmId!);

    return NextResponse.json({
      ok: true,
      message: "Recorrências processadas com sucesso.",
      data: result.data,
    });
  } catch (error) {
    console.error("[POST /api/admin/charges/recurring/process-due]", error);

    if (error instanceof Error && error.message === "FIRM_MERCADO_PAGO_NOT_CONFIGURED") {
      return NextResponse.json(
        { ok: false, message: "A advocacia não possui Mercado Pago configurado no console superadmin." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Erro ao processar cobranças recorrentes." },
      { status: 500 }
    );
  }
}