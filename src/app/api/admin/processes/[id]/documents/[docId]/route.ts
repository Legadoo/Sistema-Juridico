import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

async function getDocument(processId: string, docId: string, firmId: string) {
  const document = await prisma.processDocument.findFirst({
    where: {
      id: docId,
      processId,
      firmId,
    },
  });

  if (!document) {
    throw new Error("Documento não encontrado.");
  }

  return document;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;

  const user = await getSessionUser();
  if (!user || !user.firmId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const params = await context.params;
  const body = await req.json().catch(() => null);

  await getDocument(params.id, params.docId, user.firmId);

  const updated = await prisma.processDocument.update({
    where: {
      id: params.docId,
    },
    data: {
      docType: (body?.docType ?? "Documento").toString().trim() || "Documento",
    },
  });

  return NextResponse.json({
    ok: true,
    document: updated,
    message: "Documento atualizado.",
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;

  const user = await getSessionUser();
  if (!user || !user.firmId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const params = await context.params;
  const document = await getDocument(params.id, params.docId, user.firmId);

  await prisma.processDocument.delete({
    where: {
      id: params.docId,
    },
  });

  await unlink(document.filePath).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    message: "Documento excluído.",
  });
}