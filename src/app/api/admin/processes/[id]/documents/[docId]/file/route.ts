import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(
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

  const document = await prisma.processDocument.findFirst({
    where: {
      id: params.docId,
      processId: params.id,
      firmId: user.firmId,
    },
  });

  if (!document) {
    return NextResponse.json(
      { ok: false, message: "Documento não encontrado." },
      { status: 404 }
    );
  }

  const bytes = await readFile(document.filePath);

  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${encodeURIComponent(document.originalName)}"`,
    },
  });
}