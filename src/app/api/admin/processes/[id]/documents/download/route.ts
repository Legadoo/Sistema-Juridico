import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;

  const user = await getSessionUser();
  if (!user || !user.firmId) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const params = await context.params;
  const processId = params.id;

  const process = await prisma.legalProcess.findFirst({
    where: {
      id: processId,
      firmId: user.firmId,
    },
    select: {
      id: true,
      cnj: true,
    },
  });

  if (!process) {
    return NextResponse.json(
      { ok: false, message: "Processo não encontrado." },
      { status: 404 }
    );
  }

  const documents = await prisma.processDocument.findMany({
    where: {
      processId,
      firmId: user.firmId,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (documents.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Nenhum documento PDF para baixar." },
      { status: 404 }
    );
  }

  const outputPdf = await PDFDocument.create();

  for (const document of documents) {
    const bytes = await readFile(document.filePath);
    const sourcePdf = await PDFDocument.load(bytes);
    const pages = await outputPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

    pages.forEach((page) => outputPdf.addPage(page));
  }

  const mergedBytes = await outputPdf.save();
  const filename = `processo-${process.cnj || process.id}-documentos.pdf`;

  return new NextResponse(Buffer.from(mergedBytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}