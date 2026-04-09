import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const document = onlyDigits((body?.document ?? "").toString());
  const accessCode = (body?.accessCode ?? "").toString().trim();
  const firmSlug = (body?.firmSlug ?? "").toString().trim().toLowerCase();

  if (!document || !accessCode || !firmSlug) {
    return NextResponse.json(
      {
        ok: false,
        message: "Informe CPF/CNPJ, código de acesso e a advocacia.",
      },
      { status: 400 }
    );
  }

  const client = await prisma.client.findFirst({
    where: {
      document,
      accessCode,
      archived: false,
      firm: {
        slug: firmSlug,
        active: true,
      },
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