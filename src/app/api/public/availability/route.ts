import { NextResponse } from "next/server";
import { listPublicAvailableSlots } from "@/services/availability.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const clientId = (body?.clientId ?? "").toString().trim();

  if (!clientId) {
    return NextResponse.json(
      { ok: false, message: "Cliente não identificado." },
      { status: 400 }
    );
  }

  try {
    const slots = await listPublicAvailableSlots(clientId);

    return NextResponse.json({
      ok: true,
      slots,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar horários disponíveis.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}