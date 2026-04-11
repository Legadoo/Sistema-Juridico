import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  cancelAvailabilityWindowForFirm,
  deleteAvailabilityWindowForFirm,
  reactivateAvailabilityWindowForFirm,
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
      const window = await reactivateAvailabilityWindowForFirm(user, id);

      return NextResponse.json({
        ok: true,
        window,
        message: "Abertura reativada com sucesso.",
      });
    }

    const window = await cancelAvailabilityWindowForFirm(user, id);

    return NextResponse.json({
      ok: true,
      window,
      message: "Abertura cancelada com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar abertura.";
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
    await deleteAvailabilityWindowForFirm(user, id);

    return NextResponse.json({
      ok: true,
      message: "Abertura excluída com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao excluir abertura.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}