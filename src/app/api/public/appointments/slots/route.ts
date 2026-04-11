import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listPublicAvailableSlots } from "@/services/availability.service";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const document = (body?.document || "").trim();
  const accessCode = (body?.accessCode || "").trim();

  if (!document || !accessCode) {
    return NextResponse.json(
      { ok: false, message: "Documento e código são obrigatórios." },
      { status: 400 }
    );
  }

  const client = await prisma.client.findFirst({
    where: {
      document,
      accessCode,
      archived: false,
    },
    select: {
      id: true,
      name: true,
      firmId: true,
    },
  });

  if (!client) {
    return NextResponse.json(
      { ok: false, message: "Cliente não encontrado." },
      { status: 404 }
    );
  }

  try {
    const slots = await listPublicAvailableSlots(client.id);
    return NextResponse.json({
      ok: true,
      client,
      slots,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao listar horários.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}