import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin/guards";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

export async function POST(req: Request, context: RouteContext) {
  try {
    await requireSuperadmin();
    const { id: firmId } = await context.params;

    const body = await req.json().catch(() => null);

    const clientId = (body?.clientId ?? "").toString().trim();
    const name = (body?.name ?? "").toString().trim();
    const document = onlyDigits((body?.document ?? "").toString());
    const phone = (body?.phone ?? "").toString().trim();
    const email = (body?.email ?? "").toString().trim();

    if (!clientId || !name || !document) {
      return NextResponse.json(
        { ok: false, message: "Preencha clientId, nome e documento." },
        { status: 400 }
      );
    }

    const target = await prisma.client.findFirst({
      where: {
        id: clientId,
        firmId,
      },
      select: {
        id: true,
        document: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { ok: false, message: "Cliente da advocacia não encontrado." },
        { status: 404 }
      );
    }

    if (document !== target.document) {
      const exists = await prisma.client.findFirst({
        where: {
          firmId,
          document,
          NOT: { id: clientId },
        },
        select: { id: true },
      });

      if (exists) {
        return NextResponse.json(
          { ok: false, message: "Já existe outro cliente com este documento nesta advocacia." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        name,
        document,
        phone: phone || null,
        email: email || null,
      },
      select: {
        id: true,
        name: true,
        document: true,
        phone: true,
        email: true,
        archived: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, client: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
      }

      if (error.message === "FORBIDDEN_SUPERADMIN_ONLY") {
        return NextResponse.json(
          { ok: false, message: "Apenas SUPERADMIN pode editar clientes por esta área." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { ok: false, message: "Não foi possível atualizar o cliente." },
      { status: 500 }
    );
  }
}