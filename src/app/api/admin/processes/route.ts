import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (!user.firmId) {
    return NextResponse.json(
      { ok: false, message: "Usuário sem advocacia vinculada." },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const archived = url.searchParams.get("archived") === "1";
  const clientId = url.searchParams.get("clientId")?.trim() || "";

  const processes = await prisma.legalProcess.findMany({
    where: {
      firmId: user.firmId,
      archived,
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: true,
      updates: {
        orderBy: { date: "desc" },
        take: 1,
      },
      deadlines: {
        orderBy: { dueDate: "asc" },
        take: 3,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, processes });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (!user.firmId) {
    return NextResponse.json(
      { ok: false, message: "Usuário sem advocacia vinculada." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);

  const cnj = onlyDigits((body?.cnj ?? "").toString());
  const clientId = (body?.clientId ?? "").toString().trim();
  const notes = (body?.notes ?? "").toString().trim();
  const tribunal = (body?.tribunal ?? "").toString().trim();
  const vara = (body?.vara ?? "").toString().trim();
  const status = (body?.status ?? "ACTIVE").toString().trim();
  const startDateRaw = (body?.startDate ?? "").toString().trim();

  if (!cnj || !clientId) {
    return NextResponse.json(
      { ok: false, message: "Preencha o CNJ e selecione o cliente." },
      { status: 400 }
    );
  }

  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      firmId: user.firmId,
    },
  });

  if (!client) {
    return NextResponse.json(
      { ok: false, message: "Cliente inválido para esta advocacia." },
      { status: 403 }
    );
  }

  const existing = await prisma.legalProcess.findFirst({
    where: {
      firmId: user.firmId,
      cnj,
    },
  });

  if (existing) {
    return NextResponse.json(
      { ok: false, message: "Já existe um processo com este CNJ nesta advocacia." },
      { status: 409 }
    );
  }

  try {
    const created = await prisma.legalProcess.create({
      data: {
        cnj,
        clientId,
        firmId: user.firmId,
        notes: notes || null,
        tribunal: tribunal || null,
        vara: vara || null,
        status: status || "ACTIVE",
        startDate: startDateRaw ? new Date(startDateRaw) : null,
      },
      include: {
        client: true,
      },
    });

    return NextResponse.json({ ok: true, process: created });
  } catch (error) {
    console.error("Erro ao criar processo:", error);
    return NextResponse.json(
      { ok: false, message: "Não foi possível criar o processo." },
      { status: 500 }
    );
  }
}