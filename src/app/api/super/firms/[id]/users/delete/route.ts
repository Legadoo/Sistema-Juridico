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
        { ok: false, message: "SUPERADMIN não pode ser excluído por esta tela." },
        { status: 403 }
      );
    }

    if (actor.id === target.id) {
      return NextResponse.json(
        { ok: false, message: "Você não pode excluir sua própria conta." },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
      }

      if (error.message === "FORBIDDEN_SUPERADMIN_ONLY") {
        return NextResponse.json(
          { ok: false, message: "Apenas SUPERADMIN pode excluir usuários." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Não foi possível excluir o usuário." },
      { status: 500 }
    );
  }
}