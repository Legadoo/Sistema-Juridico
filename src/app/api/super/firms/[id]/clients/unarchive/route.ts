import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin/guards";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    await requireSuperadmin();
    const { id: firmId } = await context.params;

    const body = await req.json().catch(() => null);
    const clientId = (body?.clientId ?? "").toString().trim();

    if (!clientId) {
      return NextResponse.json(
        { ok: false, message: "clientId obrigatório." },
        { status: 400 }
      );
    }

    const target = await prisma.client.findFirst({
      where: { id: clientId, firmId },
      select: { id: true },
    });

    if (!target) {
      return NextResponse.json(
        { ok: false, message: "Cliente da advocacia não encontrado." },
        { status: 404 }
      );
    }

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: { archived: false },
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
    return NextResponse.json(
      { ok: false, message: "Não foi possível desarquivar o cliente." },
      { status: 500 }
    );
  }
}