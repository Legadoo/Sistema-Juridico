import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function safeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value;
}

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);

  const currentPassword = safeText(body?.currentPassword);
  const newPassword = safeText(body?.newPassword);
  const confirmPassword = safeText(body?.confirmPassword);

  if (!currentPassword) {
    return NextResponse.json(
      { ok: false, message: "Informe a senha atual." },
      { status: 400 }
    );
  }

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, message: "A nova senha deve ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { ok: false, message: "A confirmação da nova senha não confere." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Conta não encontrada." },
      { status: 404 }
    );
  }

  const currentPasswordOk = await bcrypt.compare(currentPassword, user.password);

  if (!currentPasswordOk) {
    return NextResponse.json(
      { ok: false, message: "Senha atual incorreta." },
      { status: 403 }
    );
  }

  const samePassword = await bcrypt.compare(newPassword, user.password);

  if (samePassword) {
    return NextResponse.json(
      { ok: false, message: "A nova senha precisa ser diferente da senha atual." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      password: passwordHash,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Senha alterada com sucesso.",
  });
}