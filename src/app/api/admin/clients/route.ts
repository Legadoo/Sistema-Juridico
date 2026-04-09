import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

  const clients = await prisma.client.findMany({
    where: {
      firmId: user.firmId,
      archived,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, clients });
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

  // ===== Limite de clientes por advocacia =====
  const firmConfig = await prisma.firmConfig.upsert({
    where: { firmId: user.firmId },
    update: {},
    create: {
      firmId: user.firmId,
      maxClients: 50,
    },
  });

  const activeClients = await prisma.client.count({
    where: {
      firmId: user.firmId,
      archived: false,
    },
  });

  if (activeClients >= firmConfig.maxClients) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Limite de clientes ativos atingido para esta advocacia. Arquive clientes ou aumente o limite nas configurações.",
      },
      { status: 403 }
    );
  }
  // ===========================================

  const body = await req.json().catch(() => null);

  const name = (body?.name ?? "").toString().trim();
  const document = onlyDigits((body?.document ?? "").toString());
  const phone = (body?.phone ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim();

  if (!name || !document) {
    return NextResponse.json(
      { ok: false, message: "Preencha nome e CPF/CNPJ." },
      { status: 400 }
    );
  }

  const existing = await prisma.client.findFirst({
    where: {
      firmId: user.firmId,
      document,
    },
  });

  if (existing) {
    return NextResponse.json(
      { ok: false, message: "Já existe um cliente com este CPF/CNPJ nesta advocacia." },
      { status: 409 }
    );
  }

  const created = await prisma.client.create({
    data: {
      name,
      document,
      phone: phone || null,
      email: email || null,
      accessCode: genCode(),
      archived: false,
      firmId: user.firmId,
    },
  });

  return NextResponse.json({ ok: true, client: created });
}