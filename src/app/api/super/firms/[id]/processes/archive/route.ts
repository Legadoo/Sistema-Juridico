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
    const processId = (body?.processId ?? "").toString().trim();

    if (!processId) {
      return NextResponse.json(
        { ok: false, message: "processId obrigatório." },
        { status: 400 }
      );
    }

    const target = await prisma.legalProcess.findFirst({
      where: { id: processId, firmId },
      select: { id: true },
    });

    if (!target) {
      return NextResponse.json(
        { ok: false, message: "Processo da advocacia não encontrado." },
        { status: 404 }
      );
    }

    const updated = await prisma.legalProcess.update({
      where: { id: processId },
      data: {
        archived: true,
        status: "ARCHIVED",
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            document: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, process: updated });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Não foi possível arquivar o processo." },
      { status: 500 }
    );
  }
}