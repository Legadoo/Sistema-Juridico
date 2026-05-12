import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Faça login para continuar." },
      { status: 401 }
    );
  }

  if (user.role === "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "SUPERADMIN não possui assinatura pública." },
      { status: 403 }
    );
  }

  try {
    const pendingSubscription = await prisma.saaSSubscription.findFirst({
      where: {
        userId: user.id,
        status: "PENDING",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!pendingSubscription) {
      return NextResponse.json({
        ok: true,
        message: "Nenhum pagamento pendente encontrado.",
      });
    }

    await prisma.saaSSubscription.update({
      where: { id: pendingSubscription.id },
      data: {
        status: "CANCELLED",
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingStatus: "PLAN_REQUIRED",
        selectedPlanId: null,
        selectedPlanNameSnapshot: null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Pagamento pendente cancelado com sucesso.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível cancelar o pagamento pendente." },
      { status: 400 }
    );
  }
}
