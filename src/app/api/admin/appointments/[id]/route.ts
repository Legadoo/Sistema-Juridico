import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { updateAppointmentStatusForFirm } from "@/services/appointment.service";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const { id } = await context.params;

  try {
    const appointment = await updateAppointmentStatusForFirm(
      user,
      id,
      body?.status,
      body?.reason
    );

    return NextResponse.json({
      ok: true,
      appointment,
      message: "Status atualizado com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar status.";

    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}