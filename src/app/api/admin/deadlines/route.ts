import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") || "30");
  const pending = (url.searchParams.get("pending") || "1") === "1";

  const now = new Date();
  const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const deadlines = await prisma.deadline.findMany({
    where: {
      ...(pending ? { done: false } : {}),
      dueDate: { lte: limit },
    },
    orderBy: { dueDate: "asc" },
    include: { process: { include: { client: true } } },
  });

  return NextResponse.json({ ok: true, deadlines });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const processId = (body?.processId ?? "").toString().trim();
  const title = (body?.title ?? "").toString().trim();
  const dueDateStr = (body?.dueDate ?? "").toString().trim();

  if (!processId || !dueDateStr) {
    return NextResponse.json({ ok: false, message: "Preencha processo e data." }, { status: 400 });
  }

  const dueDate = new Date(dueDateStr);
  if (isNaN(dueDate.getTime())) {
    return NextResponse.json({ ok: false, message: "Data inválida." }, { status: 400 });
  }

  const created = await prisma.deadline.create({
    data: {
      processId,
      title: title || "Prazo",
      dueDate,
      done: false,
    },
  });

  return NextResponse.json({ ok: true, deadline: created });
}
