import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;
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

  const { id } = await ctx.params;
  const processId = (id ?? "").toString().trim();

  if (!processId) {
    return NextResponse.json({ ok: false, message: "processId obrigatório." }, { status: 400 });
  }

  const process = await prisma.legalProcess.findFirst({
    where: {
      id: processId,
      firmId: user.firmId,
    },
    select: { id: true },
  });

  if (!process) {
    return NextResponse.json(
      { ok: false, message: "Processo não encontrado." },
      { status: 404 }
    );
  }

  const updates = await prisma.processUpdate.findMany({
    where: {
      processId: process.id,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, updates });
}

export async function POST(req: Request, ctx: Ctx) {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;
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

  const { id } = await ctx.params;
  const processId = (id ?? "").toString().trim();

  const body = await req.json().catch(() => null);
  const text = (body?.text ?? body?.message ?? body?.content ?? "").toString().trim();
  const visibleToClient = Boolean(body?.visibleToClient ?? body?.isPublic ?? body?.public ?? true);

  if (!processId || !text) {
    return NextResponse.json(
      { ok: false, message: "Mensagem obrigatória." },
      { status: 400 }
    );
  }

  const process = await prisma.legalProcess.findFirst({
    where: {
      id: processId,
      firmId: user.firmId,
    },
    select: { id: true },
  });

  if (!process) {
    return NextResponse.json(
      { ok: false, message: "Processo inválido para esta advocacia." },
      { status: 403 }
    );
  }

  const created = await prisma.processUpdate.create({
    data: {
      processId: process.id,
      text,
      visibleToClient,
    },
  });

  return NextResponse.json({ ok: true, update: created });
}