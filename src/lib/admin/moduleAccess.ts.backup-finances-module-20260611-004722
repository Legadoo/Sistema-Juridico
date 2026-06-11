import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export type FirmModuleKey =
  | "moduleDashboard"
  | "moduleClients"
  | "moduleProcesses"
  | "moduleDeadlines"
  | "moduleAppointments"
  | "moduleAvailability"
  | "moduleUsers"
  | "moduleCharges";

export async function ensureAdminModuleResponse(moduleKey: FirmModuleKey) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  if (user.role === "SUPERADMIN") {
    return null;
  }

  if (!user.firmId) {
    return NextResponse.json(
      { ok: false, message: "Usuário sem advocacia vinculada." },
      { status: 403 }
    );
  }

  const firmConfig = await prisma.firmConfig.findUnique({
    where: { firmId: user.firmId },
    select: {
      moduleDashboard: true,
      moduleClients: true,
      moduleProcesses: true,
      moduleDeadlines: true,
      moduleAppointments: true,
      moduleAvailability: true,
      moduleUsers: true,
      moduleCharges: true,
    },
  });

  if (!firmConfig) {
    return NextResponse.json(
      { ok: false, message: "Configuração da advocacia não encontrada." },
      { status: 403 }
    );
  }

  if (!firmConfig[moduleKey]) {
    return NextResponse.json(
      { ok: false, message: "Este módulo não está liberado no plano atual." },
      { status: 403 }
    );
  }

  return null;
}