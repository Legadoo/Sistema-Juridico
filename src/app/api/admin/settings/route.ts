import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "Apenas SUPERADMIN pode acessar as configurações globais." },
      { status: 403 }
    );
  }

  const config = await prisma.systemConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", maxClients: 50 },
  });

  const activeClients = await prisma.client.count({
    where: { archived: false },
  });

  return NextResponse.json({ ok: true, config, activeClients });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "Apenas SUPERADMIN pode alterar as configurações globais." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const maxClients = Number(body?.maxClients);

  if (!Number.isFinite(maxClients) || maxClients < 1 || maxClients > 100000) {
    return NextResponse.json(
      { ok: false, message: "maxClients inválido." },
      { status: 400 }
    );
  }

  const config = await prisma.systemConfig.upsert({
    where: { id: "global" },
    update: { maxClients },
    create: { id: "global", maxClients },
  });

  return NextResponse.json({ ok: true, config });
}