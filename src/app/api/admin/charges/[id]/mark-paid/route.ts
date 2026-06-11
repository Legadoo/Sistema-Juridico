import { NextRequest, NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { advanceRecurringChargeFromPaidCharge } from "@/services/recurring-charge-lifecycle.service";

function canManageCharges(role: string) {
  return role === "MASTER" || role === "SECRETARY";
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const moduleGuard = await ensureAdminModuleResponse("moduleCharges");
  if (moduleGuard) return moduleGuard;

  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  if (!user.firmId || !canManageCharges(user.role)) {
    return NextResponse.json(
      { ok: false, message: "Acesso negado." },
      { status: 403 }
    );
  }

  const params = await context.params;
  const chargeId = params.id;

  const charge = await prisma.charge.findFirst({
    where: {
      id: chargeId,
      firmId: user.firmId,
    },
    select: {
      id: true,
    },
  });

  if (!charge) {
    return NextResponse.json(
      { ok: false, message: "Cobrança não encontrada." },
      { status: 404 }
    );
  }

  const result = await advanceRecurringChargeFromPaidCharge({
    chargeId: charge.id,
    providerPaymentId: `manual-test-${Date.now()}`,
  });

  return NextResponse.json({
    ok: true,
    result,
    message: "Cobrança marcada como paga e recorrência processada.",
  });
}