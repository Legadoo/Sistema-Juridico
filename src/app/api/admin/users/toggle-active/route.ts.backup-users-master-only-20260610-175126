import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleUsers");
  if (moduleGuard) return moduleGuard;
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => null);
  const userId = (body?.userId ?? "").toString().trim();
  const active = !!body?.active;

  if (!userId) return NextResponse.json({ ok: false, message: "userId obrigatório." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ ok: false, message: "Usuário não encontrado." }, { status: 404 });

  // Regras de governança:
  // SUPERADMIN pode mexer em qualquer um (menos se quiser bloquear ele mesmo).
  // MASTER só pode mexer em SECRETARY.
  if (actor.role !== "SUPERADMIN" && actor.role !== "MASTER") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (actor.id === target.id) {
    return NextResponse.json({ ok: false, message: "Você não pode desativar sua própria conta." }, { status: 400 });
  }

  if (actor.role === "MASTER" && target.role !== "SECRETARY") {
    return NextResponse.json({ ok: false, message: "MASTER só pode ativar/desativar SECRETARY." }, { status: 403 });
  }

  // Ninguém mexe no SUPERADMIN, exceto ele mesmo (que já bloqueamos acima)
  if (target.role === "SUPERADMIN") {
    return NextResponse.json({ ok: false, message: "Conta SUPERADMIN não pode ser alterada." }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { active },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
