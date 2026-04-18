import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getAdminSiteData,
  updateLandingConfig,
} from "@/services/public-site/site";

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
    const data = await getAdminSiteData();
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível carregar os dados da landing." },
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
    const config = await updateLandingConfig(body as Record<string, unknown>);
    return NextResponse.json({
      ok: true,
      message: "Configuração da landing salva com sucesso.",
      data: config,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível salvar a landing." },
      { status: 500 }
    );
  }
}