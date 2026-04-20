import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createPublicPlanCheckout } from "@/services/subscription/public-subscription.service";

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Faça login para assinar um plano." },
      { status: 401 }
    );
  }

  if (user.role === "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "SUPERADMIN não pode comprar plano público." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const planId = (body?.planId ?? "").toString().trim();

  if (!planId) {
    return NextResponse.json(
      { ok: false, message: "Plano inválido." },
      { status: 400 }
    );
  }

  try {
    const result = await createPublicPlanCheckout({
      userId: user.id,
      planId,
    });

    return NextResponse.json({
      ok: true,
      message: result.alreadyPaid
        ? "Plano já pago."
        : result.alreadyPending
        ? "Checkout pendente reutilizado."
        : "Checkout criado com sucesso.",
      data: {
        checkoutUrl: result.checkoutUrl,
        alreadyPaid: result.alreadyPaid,
        alreadyPending: result.alreadyPending,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar o checkout do plano.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}