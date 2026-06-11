import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import { createRecurringCharge } from "@/services/recurring-charge.service";

export async function POST(request: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleCharges");
  if (moduleGuard) return moduleGuard;
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
    }

    if (!["MASTER", "SECRETARY"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Sem permissão." }, { status: 403 });
    }

    if (!user.firmId) {
      return NextResponse.json({ ok: false, message: "Firma não encontrada." }, { status: 400 });
    }

    const body = await request.json();

    const result = await createRecurringCharge({
      firmId: user.firmId,
      clientId: body.clientId,
      createdByUserId: user.id,
      description: body.description,
      baseAmount: Number(body.baseAmount),
      installments: Number(body.installments),
      chargeDay: Number(body.chargeDay),
      hasInterest: Boolean(body.hasInterest),
      interestPercent: body.interestPercent != null ? Number(body.interestPercent) : null,
      interestStartsAtInstallment: body.interestStartsAtInstallment != null
        ? Number(body.interestStartsAtInstallment)
        : null,
    });

    return NextResponse.json({
      ok: true,
      message: "Cobrança recorrente criada com sucesso.",
      data: {
        recurring: result.recurring,
        firstInstallment: result.firstInstallment,
        preview: result.preview,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/charges/recurring]", error);

    if (error instanceof Error) {
      if (error.message === "CLIENT_NOT_FOUND") {
        return NextResponse.json({ ok: false, message: "Cliente não encontrado na advocacia." }, { status: 404 });
      }

      if (error.message === "INVALID_INSTALLMENTS") {
        return NextResponse.json({ ok: false, message: "Parcelamento inválido. Use 2 ou mais parcelas." }, { status: 400 });
      }

      if (error.message === "INVALID_CHARGE_DAY") {
        return NextResponse.json({ ok: false, message: "Dia de cobrança inválido. Use de 1 a 28." }, { status: 400 });
      }

      if (error.message === "FIRM_MERCADO_PAGO_NOT_CONFIGURED") {
        return NextResponse.json({ ok: false, message: "A advocacia não possui Mercado Pago configurado no console superadmin." }, { status: 400 });
      }
    }

    return NextResponse.json(
      { ok: false, message: "Erro ao criar cobrança recorrente." },
      { status: 500 }
    );
  }
}