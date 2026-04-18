import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createUpdatePost, listUpdatePosts } from "@/services/public-site/site";

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

export async function GET() {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  try {
    const data = await listUpdatePosts();
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível listar as atualizações." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireSuperadmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, message: "Payload inválido." },
      { status: 400 }
    );
  }

  try {
    const data = await createUpdatePost(body as Record<string, unknown>);
    return NextResponse.json({
      ok: true,
      message: "Atualização criada com sucesso.",
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar a atualização.";

    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}