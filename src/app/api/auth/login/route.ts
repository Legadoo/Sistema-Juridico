import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

function getSuggestedRedirect(params: {
  role: string;
  canAccessAdmin: boolean;
  onboardingStatus?: string | null;
}) {
  if (params.role === "SUPERADMIN") return "/admin/super";
  if (params.canAccessAdmin) return "/admin";
  if (params.onboardingStatus === "FIRM_REQUIRED") return "/onboarding/firm";
  if (params.onboardingStatus === "PLAN_PENDING_PAYMENT") return "/";
  return "/";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const password = (body?.password ?? "").toString();

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Preencha email e senha." },
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
      { ok: false, message: "Login invalido." },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return NextResponse.json(
      { ok: false, message: "Login invalido." },
      { status: 401 }
    );
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { ok: false, message: "Confirme seu email antes de entrar no sistema." },
      { status: 403 }
    );
  }

  if (user.role !== "SUPERADMIN" && user.firmId && user.firm && !user.firm.active) {
    return NextResponse.json(
      {
        ok: false,
        message: "Advocacia desativada. Entre em contato com o administrador da plataforma.",
      },
      { status: 403 }
    );
  }

  const onboardingStatus = user.onboardingStatus ?? "PLAN_REQUIRED";

  const canAccessAdmin =
    user.role === "SUPERADMIN" ||
    Boolean(user.active && user.emailVerified && user.firmId && user.firm?.active);

  await createSession(user.id);

  return NextResponse.json({
    ok: true,
    redirectTo: getSuggestedRedirect({
      role: user.role,
      canAccessAdmin,
      onboardingStatus,
    }),
  });
}