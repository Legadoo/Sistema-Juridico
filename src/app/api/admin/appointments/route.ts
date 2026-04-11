import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  createAppointmentForFirm,
  listAppointmentsForFirm,
} from "@/services/appointment.service";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  try {
    const appointments = await listAppointmentsForFirm(user);
    return NextResponse.json({ ok: true, appointments });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao listar agendamentos.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  try {
    const appointment = await createAppointmentForFirm(user, {
      clientId: body?.clientId,
      scheduledAt: body?.scheduledAt,
      durationMinutes: body?.durationMinutes,
      notes: body?.notes,
    });

    return NextResponse.json({
      ok: true,
      appointment,
      message: "Agendamento criado com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar agendamento.";

    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
