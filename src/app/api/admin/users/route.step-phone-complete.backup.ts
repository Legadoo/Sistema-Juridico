import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (!user.firmId) {
    return NextResponse.json(
      { ok: false, message: "Usuário sem advocacia vinculada." },
      { status: 403 }
    );
  }

  const users = await prisma.user.findMany({
    where: {
      firmId: user.firmId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      firmId: true,
    },
  });

  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (!user.firmId) {
    return NextResponse.json(
      { ok: false, message: "Usuário sem advocacia vinculada." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);

  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const password = (body?.password ?? "").toString();
  const role = (body?.role ?? "SECRETARY").toString().trim().toUpperCase();

  if (!name || !email || !password) {
    return NextResponse.json(
      { ok: false, message: "Preencha nome, e-mail e senha." },
      { status: 400 }
    );
  }

  if (!["MASTER", "SECRETARY"].includes(role)) {
    return NextResponse.json(
      { ok: false, message: "Perfil inválido." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: {
      email,
      firmId: user.firmId,
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { ok: false, message: "Já existe um usuário com este e-mail nesta advocacia." },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, 10);

  const created = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role,
      active: true,
      firmId: user.firmId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      firmId: true,
    },
  });

  return NextResponse.json({ ok: true, user: created });
}