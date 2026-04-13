import { NextRequest, NextResponse } from "next/server";
import { processMercadoPagoWebhook } from "@/services/charge.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await processMercadoPagoWebhook(body);

    return NextResponse.json({
      ok: true,
      data: result,
      message: result.ignored ? "Webhook ignorado." : "Webhook processado.",
    });
  } catch (error) {
    console.error("mercado-pago webhook error:", error);
    return NextResponse.json(
      { ok: false, message: "Falha ao processar webhook." },
      { status: 500 },
    );
  }
}