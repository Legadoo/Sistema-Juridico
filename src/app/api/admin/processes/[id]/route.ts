import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { updateProcessForFirm } from "@/services/process.service";

function canDeleteProcess(role: string) {
  return role === "MASTER" || role === "SUPERADMIN";
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const params = await context.params;
  const processId = params.id;
  const body = await req.json().catch(() => null);

  const process = await updateProcessForFirm(processId, user.firmId, {
    cnj: body?.cnj,
    clientId: body?.clientId,
    notes: body?.notes,
    tribunal: body?.tribunal,
    vara: body?.vara,
    status: body?.status,
    startDate: body?.startDate,
  });

  return NextResponse.json({
    ok: true,
    process,
    message: "Processo atualizado com sucesso.",
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  if (!canDeleteProcess(user.role)) {
    return NextResponse.json(
      { ok: false, message: "Somente advogado pode excluir processo." },
      { status: 403 }
    );
  }

  const params = await context.params;
  const processId = params.id;

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

  await prisma.legalProcess.delete({
    where: {
      id: processId,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Processo excluído com sucesso.",
  });
}