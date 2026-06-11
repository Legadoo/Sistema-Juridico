import { NextRequest, NextResponse } from "next/server";
import { decryptText } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { advanceRecurringChargeFromPaidCharge } from "@/services/recurring-charge-lifecycle.service";

async function getPaymentFromMercadoPago(paymentId: string) {
  const configs = await prisma.paymentGatewayConfig.findMany({
    where: {
      isActive: true,
      enabledBySuperadmin: true,
    },
  });

  for (const config of configs) {
    try {
      const accessToken = decryptText(config.accessTokenEnc);

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data?.id) return data;
    } catch (error) {
      console.error("Falha ao consultar pagamento Mercado Pago:", error);
    }
  }

  return null;
}

function extractPaymentId(req: NextRequest, body: any) {
  const searchParams = req.nextUrl.searchParams;

  return (
    searchParams.get("id") ||
    searchParams.get("data.id") ||
    body?.id?.toString?.() ||
    body?.data?.id?.toString?.() ||
    body?.resource?.toString?.().split("/").pop() ||
    ""
  ).trim();
}

export async function GET(req: NextRequest) {
  return handleWebhook(req);
}

export async function POST(req: NextRequest) {
  return handleWebhook(req);
}

async function handleWebhook(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const paymentId = extractPaymentId(req, body);

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true, message: "Sem paymentId." });
  }

  const payment = await getPaymentFromMercadoPago(paymentId);

  if (!payment) {
    return NextResponse.json({ ok: true, ignored: true, message: "Pagamento não encontrado." });
  }

  if (payment.status !== "approved") {
    return NextResponse.json({
      ok: true,
      ignored: true,
      status: payment.status,
      message: "Pagamento ainda não aprovado.",
    });
  }

  const externalReference = payment.external_reference?.toString?.() || "";

  if (!externalReference) {
    return NextResponse.json({ ok: true, ignored: true, message: "Sem referência externa." });
  }

  const charge = await prisma.charge.findFirst({
    where: {
      externalReference,
    },
    select: {
      id: true,
    },
  });

  if (!charge) {
    return NextResponse.json({ ok: true, ignored: true, message: "Cobrança não encontrada." });
  }

  const result = await advanceRecurringChargeFromPaidCharge({
    chargeId: charge.id,
    providerPaymentId: payment.id?.toString?.() || paymentId,
  });

  return NextResponse.json({
    ok: true,
    result,
  });
}