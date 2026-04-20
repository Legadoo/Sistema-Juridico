import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listPlans, createPlan } from "@/services/public-site/site";

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Apenas SUPERADMIN pode acessar esta área." },
    { status: 403 }
  );
}

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  if (user.role !== "SUPERADMIN") {
    return forbidden();
  }

  try {
    const plans = await listPlans();
    return NextResponse.json({ ok: true, data: plans });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível carregar os planos." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  if (user.role !== "SUPERADMIN") {
    return forbidden();
  }

  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, message: "Payload inválido." },
      { status: 400 }
    );
  }

  try {
    const plan = await createPlan(body as Record<string, unknown>);
    return NextResponse.json({
      ok: true,
      message: "Plano criado com sucesso.",
      data: plan,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar o plano.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}