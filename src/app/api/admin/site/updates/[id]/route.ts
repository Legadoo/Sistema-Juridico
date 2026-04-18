import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { deleteUpdatePost, updateUpdatePost } from "@/services/public-site/site";

async function requireSuperadmin() {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "SUPERADMIN") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, message: "Apenas SUPERADMIN pode acessar esta área." },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const };
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, message: "Payload inválido." },
      { status: 400 }
    );
  }

  try {
    const data = await updateUpdatePost(id, body as Record<string, unknown>);
    return NextResponse.json({
      ok: true,
      message: "Atualização salva com sucesso.",
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível salvar a atualização.";

    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    await deleteUpdatePost(id);
    return NextResponse.json({
      ok: true,
      message: "Atualização removida com sucesso.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível remover a atualização." },
      { status: 400 }
    );
  }
}