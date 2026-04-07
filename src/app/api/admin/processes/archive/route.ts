import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const processId = (body?.processId ?? "").toString().trim();
  if (!processId) return NextResponse.json({ ok: false, message: "processId obrigatório." }, { status: 400 });

  await prisma.legalProcess.update({ where: { id: processId }, data: { archived: true } });
  return NextResponse.json({ ok: true });
}
