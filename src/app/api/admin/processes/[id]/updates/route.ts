import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const { id } = await ctx.params;
  const processId = (id ?? "").toString().trim();
  if (!processId) return NextResponse.json({ ok: false }, { status: 400 });

  const updates = await prisma.processUpdate.findMany({
    where: { processId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, updates });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const { id } = await ctx.params;
  const processId = (id ?? "").toString().trim();

  const body = await req.json().catch(() => null);
  const text = (body?.text ?? body?.message ?? body?.content ?? "").toString().trim();
  const visibleToClient = Boolean(body?.visibleToClient ?? body?.isPublic ?? body?.public ?? true);

  if (!processId || !text) {
    return NextResponse.json({ ok: false, message: "Mensagem obrigatória." }, { status: 400 });
  }

  const created = await prisma.processUpdate.create({
    data: { processId, text, visibleToClient },
  });

  return NextResponse.json({ ok: true, update: created });
}
