import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function canManageProcess(role: string) {
  return role === "MASTER" || role === "SUPERADMIN" || role === "SECRETARY";
}

async function ensureModuleAllowed(firmId: string, role: string) {
  if (role === "SUPERADMIN") return true;

  const config = await prisma.firmConfig.findUnique({
    where: { firmId },
    select: {
      moduleProcesses: true,
    },
  });

  return config?.moduleProcesses ?? false;
}

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sessão expirada ou não encontrada." },
      { status: 401 }
    );
  }

  if (!user.firmId) {
    return NextResponse.json(
      { ok: false, message: "Usuário sem advocacia vinculada." },
      { status: 403 }
    );
  }

  if (!canManageProcess(user.role)) {
    return NextResponse.json(
      { ok: false, message: "Sem permissão para desarquivar processo." },
      { status: 403 }
    );
  }

  const allowed = await ensureModuleAllowed(user.firmId, user.role);

  if (!allowed) {
    return NextResponse.json(
      { ok: false, message: "Módulo de processos não está liberado." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const processId = (body?.processId ?? "").toString().trim();

  if (!processId) {
    return NextResponse.json(
      { ok: false, message: "processId obrigatório." },
      { status: 400 }
    );
  }

  const process = await prisma.legalProcess.findFirst({
    where: {
      id: processId,
      firmId: user.firmId,
    },
    select: {
      id: true,
    },
  });

  if (!process) {
    return NextResponse.json(
      { ok: false, message: "Processo não encontrado." },
      { status: 404 }
    );
  }

  await prisma.legalProcess.update({
    where: {
      id: processId,
    },
    data: {
      archived: false,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Processo desarquivado com sucesso.",
  });
}