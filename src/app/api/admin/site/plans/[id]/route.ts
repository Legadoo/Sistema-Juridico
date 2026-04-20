import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { updatePlan, deletePlan } from "@/services/public-site/site";

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Apenas SUPERADMIN pode acessar esta área." },
    { status: 403 }
  );
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, context: Params) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  if (user.role !== "SUPERADMIN") {
    return forbidden();
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, message: "Payload inválido." },
      { status: 400 }
    );
  }

  try {
    const plan = await updatePlan(id, body as Record<string, unknown>);
    return NextResponse.json({
      ok: true,
      message: "Plano atualizado com sucesso.",
      data: plan,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar o plano.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, context: Params) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  if (user.role !== "SUPERADMIN") {
    return forbidden();
  }

  const { id } = await context.params;

  try {
    await deletePlan(id);
    return NextResponse.json({
      ok: true,
      message: "Plano excluído com sucesso.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível excluir o plano." },
      { status: 500 }
    );
  }
}