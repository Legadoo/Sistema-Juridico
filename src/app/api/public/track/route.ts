import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const document = onlyDigits((body?.document ?? "").toString());
  const accessCode = (body?.accessCode ?? "").toString().trim();

  console.log("TRACK body recebido:", body);
  console.log("TRACK document normalizado:", document);
  console.log("TRACK accessCode recebido:", accessCode);

  if (!document || !accessCode) {
    return NextResponse.json(
      {
        ok: false,
        message: "Informe CPF/CNPJ e código de acesso.",
      },
      { status: 400 }
    );
  }

  const client = await prisma.client.findFirst({
    where: {
      document,
      accessCode,
      archived: false,
    },
    include: {
      processes: {
        where: { archived: false },
        include: {
          updates: {
            where: { visibleToClient: true },
            orderBy: { date: "desc" },
          },
          deadlines: {
            where: { done: false },
            orderBy: { dueDate: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      firm: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  console.log("TRACK client encontrado:", client ? {
    id: client.id,
    name: client.name,
    document: client.document,
    accessCode: client.accessCode,
    archived: client.archived,
  } : null);

  if (!client) {
    return NextResponse.json(
      { ok: false, message: "Dados não encontrados." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    client,
  });
}