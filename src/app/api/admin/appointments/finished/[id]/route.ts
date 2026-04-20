import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import { deleteFinishedAppointmentForFirm } from "@/services/appointment.service";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const moduleGuard = await ensureAdminModuleResponse("moduleAppointments");
  if (moduleGuard) return moduleGuard;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  try {
    await deleteFinishedAppointmentForFirm(user, id);

    return NextResponse.json({
      ok: true,
      message: "Agendamento excluído com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao excluir agendamento.";

    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}