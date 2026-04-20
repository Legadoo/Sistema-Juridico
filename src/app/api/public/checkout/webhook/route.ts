import { NextResponse } from "next/server";
import { processPublicSubscriptionWebhook } from "@/services/subscription/public-subscription.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  try {
    const result = await processPublicSubscriptionWebhook(body);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao processar webhook do plano.";

    return NextResponse.json(
      { ok: false, message },
      { status: 500 }
    );
  }
}