import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
    const name = (body?.name ?? "").toString().trim();
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? "").toString();
    const phone = (body?.phone ?? "").toString().trim();
    const role = (body?.role ?? "").toString().trim().toUpperCase();

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
        email: true,
        phone: true,
        role: true,
        firmId: true,
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
        { ok: false, message: "SUPERADMIN não pode ser editado por esta tela." },
        { status: 403 }
      );
    }

    if (email && email !== target.email) {
      const exists = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (exists) {
        return NextResponse.json(
          { ok: false, message: "Já existe um usuário com este e-mail." },
          { status: 409 }
        );
      }
    }

    const data: Record<string, unknown> = {};

    if (name) data.name = name;
    if (email) data.email = email;

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    data.phone = phone || null;

    if (role) {
      if (!["MASTER", "SECRETARY"].includes(role)) {
        return NextResponse.json(
          { ok: false, message: "Cargo inválido." },
          { status: 400 }
        );
      }

      data.role = role;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated, actorId: actor.id });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
      }

      if (error.message === "FORBIDDEN_SUPERADMIN_ONLY") {
        return NextResponse.json(
          { ok: false, message: "Apenas SUPERADMIN pode editar usuários desta área." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Não foi possível atualizar o usuário." },
      { status: 500 }
    );
  }
}
