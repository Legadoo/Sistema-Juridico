import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const actor = await getSessionUser();

  if (!actor || actor.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      emailVerified: true,
      onboardingStatus: true,
      selectedPlanId: true,
      selectedPlanNameSnapshot: true,
      firmId: true,
      firm: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, users });
}