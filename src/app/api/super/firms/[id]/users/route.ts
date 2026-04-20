import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin/guards";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    await requireSuperadmin();

    const { id } = await context.params;

    const firm = await prisma.lawFirm.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!firm) {
      return NextResponse.json(
        { ok: false, message: "Advocacia não encontrada." },
        { status: 404 }
      );
    }

    const users = await prisma.user.findMany({
      where: { firmId: id },
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ ok: true, users });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
      }

      if (error.message === "FORBIDDEN_SUPERADMIN_ONLY") {
        return NextResponse.json(
          { ok: false, message: "Apenas SUPERADMIN pode acessar esta área." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Não foi possível carregar os usuários." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    await requireSuperadmin();

    const { id } = await context.params;
    const body = await req.json().catch(() => null);

    const name = (body?.name ?? "").toString().trim();
    const email = (body?.email ?? "").toString().trim().toLowerCase();
    const password = (body?.password ?? "").toString();
    const phone = (body?.phone ?? "").toString().trim() || null;
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

    const firm = await prisma.lawFirm.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!firm) {
      return NextResponse.json(
        { ok: false, message: "Advocacia não encontrada." },
        { status: 404 }
      );
    }

    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return NextResponse.json(
        { ok: false, message: "Já existe um usuário com este e-mail." },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        phone,
        role,
        active: true,
        firmId: id,
      },
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

    return NextResponse.json({ ok: true, user: created });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
      }

      if (error.message === "FORBIDDEN_SUPERADMIN_ONLY") {
        return NextResponse.json(
          { ok: false, message: "Apenas SUPERADMIN pode alterar esta área." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Não foi possível criar o usuário." },
      { status: 500 }
    );
  }
}
