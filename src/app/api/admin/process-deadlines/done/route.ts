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
  const id = (body?.id ?? "").toString().trim();
  const done = Boolean(body?.done ?? true);

  if (!id) return NextResponse.json({ ok: false, message: "id obrigatório." }, { status: 400 });

  await prisma.deadline.update({ where: { id }, data: { done } });
  return NextResponse.json({ ok: true });
}
