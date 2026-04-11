import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicAppointmentFromSlot } from "@/services/availability.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const document = (body?.document || "").trim();
  const accessCode = (body?.accessCode || "").trim();
  const slotId = (body?.slotId || "").trim();
  const notes = body?.notes;

  if (!document || !accessCode || !slotId) {
    return NextResponse.json(
      { ok: false, message: "Documento, código e horário são obrigatórios." },
      { status: 400 }
    );
  }

  const client = await prisma.client.findFirst({
    where: {
      document,
      accessCode,
      archived: false,
    },
    select: {
      id: true,
      name: true,
      firmId: true,
    },
  });

  if (!client) {
    return NextResponse.json(
      { ok: false, message: "Cliente não encontrado." },
      { status: 404 }
    );
  }

  try {
    const appointment = await createPublicAppointmentFromSlot(client.id, {
      clientId: client.id,
      slotId,
      notes,
    });

    return NextResponse.json({
      ok: true,
      appointment,
      message: "Agendamento realizado com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao reservar horário.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}