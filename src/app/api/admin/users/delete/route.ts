import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 401 });

  if (actor.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas SUPERADMIN pode excluir contas." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const userId = (body?.userId ?? "").toString().trim();

  if (!userId) return NextResponse.json({ ok: false, message: "userId obrigatório." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ ok: false, message: "Usuário não encontrado." }, { status: 404 });

  if (target.role === "SUPERADMIN") {
    return NextResponse.json({ ok: false, message: "Não é permitido excluir o SUPERADMIN." }, { status: 403 });
  }

  if (actor.id === target.id) {
    return NextResponse.json({ ok: false, message: "Você não pode excluir sua própria conta." }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
