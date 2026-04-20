import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, destroySession } from "@/lib/session";

function getSuggestedRedirect(params: {
  role: string;
  canAccessAdmin: boolean;
  onboardingStatus?: string | null;
}) {
  if (params.role === "SUPERADMIN") return "/admin/super";
  if (params.canAccessAdmin) return "/admin";
  if (params.onboardingStatus === "FIRM_REQUIRED") return "/onboarding/firm";
  if (params.onboardingStatus === "PLAN_PENDING_PAYMENT") return "/";
  return "/";
}

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let firm = null;

  if (user.firmId) {
    firm = await prisma.lawFirm.findUnique({
      where: { id: user.firmId },
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
      },
    });

    if (user.role !== "SUPERADMIN" && (!firm || !firm.active)) {
      await destroySession();
      return NextResponse.json(
        {
          ok: false,
          message: "Advocacia desativada.",
        },
        { status: 401 }
      );
    }
  }

  let firmConfig = null;

  if (user.firmId) {
    firmConfig = await prisma.firmConfig.findUnique({
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
  }

  const onboardingStatus = user.onboardingStatus ?? "PLAN_REQUIRED";

  const canAccessAdmin =
    user.role === "SUPERADMIN" ||
    Boolean(user.active && user.firmId && firm?.active);

  const suggestedRedirect = getSuggestedRedirect({
    role: user.role,
    canAccessAdmin,
    onboardingStatus,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      firmId: user.firmId,
      onboardingStatus,
      selectedPlanId: user.selectedPlanId ?? null,
      selectedPlanNameSnapshot: user.selectedPlanNameSnapshot ?? null,
      canAccessAdmin,
    },
    firm,
    firmConfig,
    suggestedRedirect,
  });
}