import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { validateAndCalculatePublicCoupon } from "@/services/public-site/coupon.service";

function parsePlanAmount(priceLabel: string) {
  const normalized = (priceLabel || "")
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Preço do plano inválido.");
  }

  return amount;
}

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Faça login para continuar." },
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
  const couponCode = (body?.couponCode ?? "").toString().trim().toUpperCase();

  if (!planId) {
    return NextResponse.json(
      { ok: false, message: "Plano inválido." },
      { status: 400 }
    );
  }

  try {
    const plan = await prisma.publicPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive || !plan.isPurchasable) {
      return NextResponse.json(
        { ok: false, message: "Plano indisponível." },
        { status: 400 }
      );
    }

    const originalAmount = parsePlanAmount(plan.priceLabel);

    const couponResult = await validateAndCalculatePublicCoupon({
      code: couponCode,
      amount: originalAmount,
    });

    return NextResponse.json({
      ok: true,
      data: {
        planId: plan.id,
        planName: plan.name,
        couponCode: couponResult.coupon?.code ?? null,
        originalAmount,
        discountAmount: couponResult.discountAmount,
        finalAmount: couponResult.finalAmount,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível aplicar o cupom.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}
