import { NextResponse } from "next/server";
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
      select: { id: true, name: true },
    });

    if (!firm) {
      return NextResponse.json(
        { ok: false, message: "Advocacia não encontrada." },
        { status: 404 }
      );
    }

    const clients = await prisma.client.findMany({
      where: { firmId: id },
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json({
      ok: true,
      firm,
      clients,
    });
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
      { ok: false, message: "Não foi possível carregar os clientes da advocacia." },
      { status: 500 }
    );
  }
}