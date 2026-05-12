import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import { processDueRecurringChargesForFirm } from "@/services/recurring-charge-processor.service";
import { processExpiredChargesForFirm } from "@/services/expired-charge-processor.service";

export async function POST() {
  const moduleGuard = await ensureAdminModuleResponse("moduleCharges");
  if (moduleGuard) return moduleGuard;
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: "NÃ£o autenticado." }, { status: 401 });
    }

    if (!["MASTER", "SECRETARY", "SUPERADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Sem permissÃ£o." }, { status: 403 });
    }

    if (!user.firmId && user.role !== "SUPERADMIN") {
      return NextResponse.json({ ok: false, message: "Firma nÃ£o encontrada." }, { status: 400 });
    }

    if (user.role === "SUPERADMIN") {
      return NextResponse.json(
        { ok: false, message: "Use um usuÃ¡rio vinculado Ã  advocacia para processar recorrÃªncias por firma." },
        { status: 400 }
      );
    }

    const dueResult = await processDueRecurringChargesForFirm(user.firmId!);
    const expiredResult = await processExpiredChargesForFirm(user.firmId!);

    const result = {
      data: {
        due: dueResult.data,
        expired: expiredResult.data,
      },
    };

    return NextResponse.json({
      ok: true,
      message: "RecorrÃªncias processadas com sucesso.",
      data: result.data,
    });
  } catch (error) {
    console.error("[POST /api/admin/charges/recurring/process-due]", error);

    if (error instanceof Error && error.message === "FIRM_MERCADO_PAGO_NOT_CONFIGURED") {
      return NextResponse.json(
        { ok: false, message: "A advocacia nÃ£o possui Mercado Pago configurado no console superadmin." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "Erro ao processar cobranÃ§as recorrentes." },
      { status: 500 }
    );
  }
}