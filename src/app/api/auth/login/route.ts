import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

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
      { ok: false, message: "Login inválido." },
      { status: 401 }
    );
  }

  // SUPERADMIN pode existir sem firma
  if (user.role !== "SUPERADMIN") {
    if (!user.firmId || !user.firm) {
      return NextResponse.json(
        { ok: false, message: "Usuário sem advocacia válida vinculada." },
        { status: 403 }
      );
    }

    if (!user.firm.active) {
      return NextResponse.json(
        {
          ok: false,
          message: "Advocacia desativada. Entre em contato com o administrador da plataforma.",
        },
        { status: 403 }
      );
    }
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return NextResponse.json(
      { ok: false, message: "Login inválido." },
      { status: 401 }
    );
  }

  await createSession(user.id);

  return NextResponse.json({
    ok: true,
    redirectTo: user.role === "SUPERADMIN" ? "/admin/super" : "/admin",
  });
}