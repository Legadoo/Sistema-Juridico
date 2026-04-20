import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

function getSuggestedRedirect(params: {
  role: string;
  firmId?: string | null;
  onboardingStatus?: string | null;
}) {
  if (params.role === "SUPERADMIN") return "/admin/super";

  if (params.firmId && params.onboardingStatus === "ACTIVE") {
    return "/admin";
  }

  if (params.onboardingStatus === "FIRM_REQUIRED") {
    return "/onboarding/firm";
  }

  if (params.onboardingStatus === "PLAN_PENDING_PAYMENT") {
    return "/";
  }

  return "/";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const password = (body?.password ?? "").toString();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Preencha e-mail e senha." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      firm: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
    },
  });

  if (!user || !user.active) {
    return NextResponse.json(
      { ok: false, message: "Login inválido." },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return NextResponse.json(
      { ok: false, message: "Login inválido." },
      { status: 401 }
    );
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { ok: false, message: "Confirme seu e-mail antes de entrar no sistema." },
      { status: 403 }
    );
  }

  const onboardingStatus = user.onboardingStatus ?? "PLAN_REQUIRED";

  if (user.role !== "SUPERADMIN") {
    if (user.firmId && user.firm && !user.firm.active) {
      return NextResponse.json(
        {
          ok: false,
          message: "Advocacia desativada. Entre em contato com o administrador da plataforma.",
        },
        { status: 403 }
      );
    }

    if (onboardingStatus === "ACTIVE" && (!user.firmId || !user.firm)) {
      return NextResponse.json(
        { ok: false, message: "Usuário ACTIVE sem advocacia válida vinculada." },
        { status: 403 }
      );
    }
  }

  await createSession(user.id);

  return NextResponse.json({
    ok: true,
    redirectTo: getSuggestedRedirect({
      role: user.role,
      firmId: user.firmId,
      onboardingStatus,
    }),
  });
}
