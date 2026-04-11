import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  deactivateAvailabilitySlotForFirm,
  reactivateAvailabilitySlotForFirm,
  deleteAvailabilitySlotForFirm,
} from "@/services/availability.service";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const { id } = await context.params;

  try {
    if (action === "reativar") {
      const slot = await reactivateAvailabilitySlotForFirm(user, id);

      return NextResponse.json({
        ok: true,
        slot,
        message: "Horário reativado com sucesso.",
      });
    }

    const slot = await deactivateAvailabilitySlotForFirm(user, id);

    return NextResponse.json({
      ok: true,
      slot,
      message: "Horário desativado com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar horário.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await deleteAvailabilitySlotForFirm(user, id);

    return NextResponse.json({
      ok: true,
      message: "Horário excluído com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao excluir horário.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}