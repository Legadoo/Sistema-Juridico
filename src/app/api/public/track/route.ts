import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const document = onlyDigits((body?.document ?? "").toString());
  const code = (body?.code ?? "").toString().trim();

  if (!document || !code) {
    return NextResponse.json({ ok: false, message: "Preencha CPF/CNPJ e código." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { document } });
  if (!client || client.archived) {
    return NextResponse.json({ ok: false, message: "Dados não encontrados." }, { status: 404 });
  }

  if (client.accessCode !== code) {
    return NextResponse.json({ ok: false, message: "Código inválido." }, { status: 401 });
  }

  const processes = await prisma.legalProcess.findMany({
    where: { clientId: client.id, archived: false },
    orderBy: { createdAt: "desc" },
    include: {
      updates: {
        where: { visibleToClient: true },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    client: { name: client.name, document: client.document },
    processes: processes.map((p) => ({
      id: p.id,
      cnj: p.cnj,
      tribunal: p.tribunal,
      vara: p.vara,
      status: p.status,
      updates: p.updates.map((u) => ({ date: u.date, text: u.text })),
    })),
  });
}
