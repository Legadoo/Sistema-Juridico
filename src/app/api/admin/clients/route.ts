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

  const url = new URL(req.url);
  const archived = url.searchParams.get("archived") === "1";

  const clients = await prisma.client.findMany({
    where: { archived },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, clients });
}

export async function POST(req: Request) {
  
  // ===== Limite de clientes (configurado pelo SUPERADMIN) =====
  const config = await prisma.systemConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", maxClients: 50 },
  });

  const activeClients = await prisma.client.count({ where: { archived: false } });

  if (activeClients >= config.maxClients) {
    return NextResponse.json(
      { ok: false, message: "Limite de clientes ativos atingido. Arquive clientes ou aumente o limite nas Configurações." },
      { status: 403 }
    );
  }
  // ===========================================================
const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => null);

  const name = (body?.name ?? "").toString().trim();
  const document = onlyDigits((body?.document ?? "").toString());
  const phone = (body?.phone ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim();

  if (!name || !document) {
    return NextResponse.json({ ok: false, message: "Preencha nome e CPF/CNPJ." }, { status: 400 });
  }

  const created = await prisma.client.create({
    data: {
      name,
      document,
      phone: phone || null,
      email: email || null,
      accessCode: genCode(),
      archived: false,
    },
  });

  return NextResponse.json({ ok: true, client: created });
}

