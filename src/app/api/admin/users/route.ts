import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const where =
    user.role === "MASTER"
      ? { role: "SECRETARY" }     // MASTER só enxerga SECRETARY
      : {};                       // SUPERADMIN enxerga tudo

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, users });
}

export async function POST(req: Request) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 401 });

  if (actor.role !== "MASTER" && actor.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const role = (body?.role ?? "SECRETARY").toString().toUpperCase();
  const password = (body?.password ?? "").toString();

  if (!name || !email || !password) {
    return NextResponse.json({ ok: false, message: "Preencha nome, email e senha." }, { status: 400 });
  }

  // MASTER só cria SECRETARY
  if (actor.role === "MASTER" && role !== "SECRETARY") {
    return NextResponse.json({ ok: false, message: "MASTER só pode criar SECRETARY." }, { status: 403 });
  }

  // SUPERADMIN pode criar MASTER e SECRETARY (mas não SUPERADMIN)
  if (role !== "MASTER" && role !== "SECRETARY") {
    return NextResponse.json({ ok: false, message: "Role inválida." }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ ok: false, message: "Já existe usuário com esse email." }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);

  const created = await prisma.user.create({
    data: { name, email, password: hash, role, active: true },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, user: created });
}
