import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const actor = await getSessionUser();

  if (!actor || actor.role !== "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "Acesso negado." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const id = (body?.id ?? "").toString().trim();

  if (!id) {
    return NextResponse.json(
      { ok: false, message: "Usuário não informado." },
      { status: 400 }
    );
  }

  if (id === actor.id) {
    return NextResponse.json(
      { ok: false, message: "Você não pode excluir sua própria conta." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
    },
  });

  if (!target) {
    return NextResponse.json(
      { ok: false, message: "Usuário não encontrado." },
      { status: 404 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({
        where: { userId: id },
      });

      await tx.user.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      ok: true,
      deleted: true,
      message: "Usuário excluído com sucesso.",
    });
  } catch {
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    await prisma.user.update({
      where: { id },
      data: {
        active: false,
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: false,
      deactivated: true,
      message:
        "Não foi possível excluir totalmente porque existem vínculos no sistema. A conta foi desativada com sucesso.",
    });
  }
}
