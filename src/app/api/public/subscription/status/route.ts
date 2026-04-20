import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getPublicSubscriptionStatusForUser } from "@/services/subscription/public-subscription.service";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  if (user.role === "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "SUPERADMIN não utiliza assinatura pública." },
      { status: 403 }
    );
  }

  try {
    const status = await getPublicSubscriptionStatusForUser(user.id);
    return NextResponse.json({
      ok: true,
      data: status,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível consultar o status da assinatura.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}