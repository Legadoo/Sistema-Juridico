import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const processes = await prisma.legalProcess.findMany({
    where: { archived: true },
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  return NextResponse.json({ ok: true, processes });
}
