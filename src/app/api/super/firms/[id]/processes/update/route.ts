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

    const processId = (body?.processId ?? "").toString().trim();
    const cnj = onlyDigits((body?.cnj ?? "").toString());
    const tribunal = (body?.tribunal ?? "").toString().trim();
    const vara = (body?.vara ?? "").toString().trim();
    const status = (body?.status ?? "").toString().trim().toUpperCase();

    if (!processId || !cnj) {
      return NextResponse.json(
        { ok: false, message: "Preencha processId e CNJ." },
        { status: 400 }
      );
    }

    const target = await prisma.legalProcess.findFirst({
      where: {
        id: processId,
        firmId,
      },
      select: {
        id: true,
        cnj: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { ok: false, message: "Processo da advocacia não encontrado." },
        { status: 404 }
      );
    }

    if (cnj !== target.cnj) {
      const exists = await prisma.legalProcess.findFirst({
        where: {
          firmId,
          cnj,
          NOT: { id: processId },
        },
        select: { id: true },
      });

      if (exists) {
        return NextResponse.json(
          { ok: false, message: "Já existe outro processo com este CNJ nesta advocacia." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.legalProcess.update({
      where: { id: processId },
      data: {
        cnj,
        tribunal: tribunal || null,
        vara: vara || null,
        status: status || "ACTIVE",
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
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Não foi possível atualizar o processo." },
      { status: 500 }
    );
  }
}