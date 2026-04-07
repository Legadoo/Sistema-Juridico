import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const updateId = (body?.updateId ?? "").toString().trim();
  if (!updateId) return NextResponse.json({ ok: false, message: "updateId obrigatório." }, { status: 400 });

  await prisma.processUpdate.delete({ where: { id: updateId } });
  return NextResponse.json({ ok: true });
}
