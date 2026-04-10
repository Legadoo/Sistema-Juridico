import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin/guards";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const actor = await requireSuperadmin();
    const { id: firmId } = await context.params;

    const body = await req.json().catch(() => null);
    const userId = (body?.userId ?? "").toString().trim();
    const active = Boolean(body?.active);

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "userId obrigatório." },
        { status: 400 }
      );
    }

    const target = await prisma.user.findFirst({
      where: {
        id: userId,
        firmId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { ok: false, message: "Usuário da advocacia não encontrado." },
        { status: 404 }
      );
    }

    if (target.role === "SUPERADMIN") {
      return NextResponse.json(
        { ok: false, message: "SUPERADMIN não pode ser alterado por esta tela." },
        { status: 403 }
      );
    }

    if (actor.id === target.id) {
      return NextResponse.json(
        { ok: false, message: "Você não pode alterar sua própria conta." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { active },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
      }

      if (error.message === "FORBIDDEN_SUPERADMIN_ONLY") {
        return NextResponse.json(
          { ok: false, message: "Apenas SUPERADMIN pode ativar ou desativar usuários." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Não foi possível alterar o status do usuário." },
      { status: 500 }
    );
  }
}