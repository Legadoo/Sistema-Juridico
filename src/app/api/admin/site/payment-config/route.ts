import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getPublicSitePaymentConfigForAdmin,
  savePublicSitePaymentConfig,
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
    const data = await getPublicSitePaymentConfigForAdmin();
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível carregar a configuração de pagamento do site." },
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
    const config = await savePublicSitePaymentConfig(body as Record<string, unknown>);
    return NextResponse.json({
      ok: true,
      message: "Configuração de pagamento do site salva com sucesso.",
      data: {
        id: config.id,
        provider: config.provider,
        isActive: config.isActive,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível salvar a configuração do pagamento do site.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}