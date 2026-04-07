import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  // só SUPERADMIN pode excluir processo
  if (user.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false, message: "Apenas SUPERADMIN pode excluir processos." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const processId = (body?.processId ?? "").toString().trim();

  if (!processId) {
    return NextResponse.json({ ok: false, message: "processId obrigatório." }, { status: 400 });
  }

  await prisma.legalProcess.delete({ where: { id: processId } });

  return NextResponse.json({ ok: true });
}
