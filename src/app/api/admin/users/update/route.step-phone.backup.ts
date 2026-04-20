import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => null);
  const userId = (body?.userId ?? "").toString().trim();
  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const password = (body?.password ?? "").toString();
  const roleRaw = (body?.role ?? "").toString().trim().toUpperCase(); // opcional

  if (!userId) return NextResponse.json({ ok: false, message: "userId obrigatório." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ ok: false, message: "Usuário não encontrado." }, { status: 404 });

  // Permissões:
  // SUPERADMIN edita qualquer um (inclui ele mesmo), mas não muda para SUPERADMIN.
  // MASTER só edita SECRETARY (apenas dados básicos + senha)
  if (actor.role !== "SUPERADMIN" && actor.role !== "MASTER") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (actor.role === "MASTER" && target.role !== "SECRETARY") {
    return NextResponse.json({ ok: false, message: "MASTER só pode editar SECRETARY." }, { status: 403 });
  }

  // Email único
  if (email && email !== target.email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ ok: false, message: "Email já está em uso." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  // Dados básicos (MASTER e SUPERADMIN)
  if (name) data.name = name;
  if (email) data.email = email;
  if (password) data.password = await bcrypt.hash(password, 10);

  // Role: SOMENTE SUPERADMIN pode trocar
  if (roleRaw) {
    if (actor.role !== "SUPERADMIN") {
      return NextResponse.json({ ok: false, message: "Apenas SUPERADMIN pode mudar o cargo." }, { status: 403 });
    }

    if (roleRaw !== "MASTER" && roleRaw !== "SECRETARY") {
      return NextResponse.json({ ok: false, message: "Cargo inválido." }, { status: 400 });
    }

    // Não permitir mexer no SUPERADMIN
    if (target.role === "SUPERADMIN") {
      return NextResponse.json({ ok: false, message: "Não é permitido alterar o SUPERADMIN." }, { status: 403 });
    }

    data.role = roleRaw;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
