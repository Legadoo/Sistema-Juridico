import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => null);
  const clientId = (body?.clientId ?? "").toString().trim();

  if (!clientId) return NextResponse.json({ ok: false, message: "clientId obrigatório." }, { status: 400 });

  await prisma.client.update({
    where: { id: clientId },
    data: { archived: true },
  });

  return NextResponse.json({ ok: true });
}
