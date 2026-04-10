import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (!user.firmId) {
    return NextResponse.json(
      { ok: false, message: "Usuário sem advocacia vinculada." },
      { status: 403 }
    );
  }

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const url = new URL(req.url);

  const pendingParam = url.searchParams.get("pending");
  const daysParam = url.searchParams.get("days");

  const where: Record<string, unknown> = {
    process: {
      firmId: user.firmId,
    },
  };

  if (pendingParam === "1") {
    where.done = false;
  } else if (pendingParam === "0") {
    where.done = true;
  }

  if (daysParam) {
    const days = Number(daysParam);
    if (!Number.isNaN(days) && days > 0) {
      const now = new Date();
      const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      where.dueDate = { lte: limit };
    }
  }

  const deadlines = await prisma.deadline.findMany({
    where,
    orderBy: [{ done: "asc" }, { dueDate: "asc" }],
    include: {
      process: {
        include: {
          client: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, deadlines });
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

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const processId = (body?.processId ?? "").toString().trim();
  const title = (body?.title ?? "").toString().trim();
  const description = (body?.description ?? "").toString().trim();
  const dueDateStr = (
    body?.dueDate ??
    body?.dueAt ??
    body?.date ??
    body?.deadlineAt ??
    ""
  ).toString().trim();

  if (!processId || !dueDateStr) {
    return NextResponse.json(
      { ok: false, message: "Preencha processo e data." },
      { status: 400 }
    );
  }

  const process = await prisma.legalProcess.findFirst({
    where: {
      id: processId,
      firmId: user.firmId,
    },
  });

  if (!process) {
    return NextResponse.json(
      { ok: false, message: "Processo inválido para esta advocacia." },
      { status: 403 }
    );
  }

  const dueDate = new Date(dueDateStr);
  if (isNaN(dueDate.getTime())) {
    return NextResponse.json(
      { ok: false, message: "Data inválida." },
      { status: 400 }
    );
  }

  const created = await prisma.deadline.create({
    data: {
      processId,
      title: title || "Prazo",
      description: description || null,
      dueDate,
      done: false,
    },
  });

  return NextResponse.json({ ok: true, deadline: created });
}
