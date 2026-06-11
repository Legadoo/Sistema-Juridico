import { NextResponse } from "next/server";
import { createPublicAppointmentFromSlot } from "@/services/availability.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const clientId = (body?.clientId ?? "").toString().trim();
  const slotId = (body?.slotId ?? "").toString().trim();
  const notes = (body?.notes ?? "").toString().trim();

  if (!clientId || !slotId) {
    return NextResponse.json(
      { ok: false, message: "Cliente e horário são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const appointment = await createPublicAppointmentFromSlot(clientId, {
      clientId,
      slotId,
      notes,
    });

    return NextResponse.json({
      ok: true,
      appointment,
      message: "Agendamento solicitado com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao reservar horário.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}