import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/superadmin/guards";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperadmin();

    const { id: firmId } = await params;

    const result = await prisma.appointment.deleteMany({
      where: {
        firmId,
        status: {
          in: ["CANCELADO", "CONCLUIDO"],
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Histórico apagado com sucesso.",
      data: {
        deletedCount: result.count,
      },
    });
  } catch (error) {
    console.error("[POST /api/super/firms/[id]/appointments/purge-history]", error);

    return NextResponse.json(
      { ok: false, message: "Erro ao apagar histórico." },
      { status: 500 }
    );
  }
}