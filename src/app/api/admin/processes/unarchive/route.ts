import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  // Quem pode desarquivar (ajuste se quiser liberar pra SECRETARY também)
  if (user.role !== "MASTER" && user.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false, message: "Sem permissão." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const processId = (body?.processId ?? body?.id ?? "").toString().trim();

  if (!processId) {
    return NextResponse.json({ ok: false, message: "processId obrigatório." }, { status: 400 });
  }

  await prisma.legalProcess.update({
    where: { id: processId },
    data: { archived: false },
  });

  return NextResponse.json({ ok: true });
}
