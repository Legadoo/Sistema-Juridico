import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { createFirmForPaidUser } from "@/services/subscription/public-subscription.service";

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  if (user.role === "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "SUPERADMIN não utiliza este fluxo." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const firmName = (body?.firmName ?? "").toString();

  if (!firmName.trim()) {
    return NextResponse.json(
      { ok: false, message: "Nome da advocacia é obrigatório." },
      { status: 400 }
    );
  }

  try {
    const result = await createFirmForPaidUser({
      userId: user.id,
      firmName,
    });

    return NextResponse.json({
      ok: true,
      message: "Advocacia criada com sucesso.",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível criar a advocacia.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}