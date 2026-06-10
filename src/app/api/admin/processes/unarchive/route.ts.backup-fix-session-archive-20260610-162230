import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function canManageProcess(role: string) {
  return role === "MASTER" || role === "SUPERADMIN" || role === "SECRETARY";
}

export async function POST(req: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;

  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
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