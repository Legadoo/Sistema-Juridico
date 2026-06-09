import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const actor = await getSessionUser();

  if (!actor || actor.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const id = (body?.id ?? "").toString().trim();
  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const phone = (body?.phone ?? "").toString().trim();
  const role = (body?.role ?? "").toString().trim().toUpperCase();
  const onboardingStatusRaw = body?.onboardingStatus;
  const selectedPlanId = (body?.selectedPlanId ?? "").toString().trim();
  const firmId = (body?.firmId ?? "").toString().trim();
  const active = Boolean(body?.active);

  if (!id || !name || !email || !role) {
    return NextResponse.json(
      { ok: false, message: "Preencha os campos obrigatorios." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      firmId: true,
      onboardingStatus: true,
      selectedPlanId: true,
      emailVerified: true,
      active: true,
    },
  });

  if (!target) {
    return NextResponse.json(
      { ok: false, message: "Usuario nao encontrado." },
      { status: 404 }
    );
  }

  const existingEmail = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id },
    },
    select: { id: true },
  });

  if (existingEmail) {
    return NextResponse.json(
      { ok: false, message: "Ja existe outro usuario com este email." },
      { status: 409 }
    );
  }

  let selectedPlanNameSnapshot: string | null = null;
  let selectedPlan: { id: string; name: string } | null = null;

  if (selectedPlanId) {
    selectedPlan = await prisma.publicPlan.findUnique({
      where: { id: selectedPlanId },
      select: { id: true, name: true },
    });

    if (!selectedPlan) {
      return NextResponse.json(
        { ok: false, message: "Plano selecionado nao encontrado." },
        { status: 400 }
      );
    }

    selectedPlanNameSnapshot = selectedPlan.name;
  }

  if (firmId) {
    const firm = await prisma.lawFirm.findUnique({
      where: { id: firmId },
      select: { id: true },
    });

    if (!firm) {
      return NextResponse.json(
        { ok: false, message: "Advocacia selecionada nao encontrada." },
        { status: 400 }
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const data: Record<string, unknown> = {
      name,
      email,
      phone: phone || null,
      role,
      active,
    };

    if (role === "SUPERADMIN") {
      data.firmId = null;
      data.onboardingStatus = null;
      data.selectedPlanId = null;
      data.selectedPlanNameSnapshot = null;
    } else {
      data.firmId = firmId || null;
      data.selectedPlanId = selectedPlanId || null;
      data.selectedPlanNameSnapshot = selectedPlanNameSnapshot;

      let onboardingStatus =
        onboardingStatusRaw === null || onboardingStatusRaw === undefined || onboardingStatusRaw === ""
          ? "PLAN_REQUIRED"
          : onboardingStatusRaw.toString().trim();

      if (selectedPlanId && !firmId && active && target.emailVerified) {
        onboardingStatus = "FIRM_REQUIRED";
      }

      if (!selectedPlanId && !firmId && onboardingStatus === "ACTIVE") {
        onboardingStatus = "PLAN_REQUIRED";
      }

      if (firmId && active && target.emailVerified) {
        if (onboardingStatus === "PLAN_REQUIRED") {
          onboardingStatus = selectedPlanId ? "ACTIVE" : "PLAN_REQUIRED";
        }
      }

      data.onboardingStatus = onboardingStatus;
    }

    const updated = await tx.user.update({
      where: { id },
      data,
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

    if (role !== "SUPERADMIN") {
      if (selectedPlan) {
        const manualExternalReference = `manual_plan_${updated.id}_${selectedPlan.id}`;

        const existingManualSubscription = await tx.saaSSubscription.findFirst({
          where: {
            userId: updated.id,
            provider: "SUPERADMIN_MANUAL",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (existingManualSubscription) {
          await tx.saaSSubscription.update({
            where: { id: existingManualSubscription.id },
            data: {
              publicPlanId: selectedPlan.id,
              status: "PAID",
              provider: "SUPERADMIN_MANUAL",
              providerPreferenceId: null,
              providerPaymentId: "manual",
              externalReference: manualExternalReference,
              checkoutUrl: null,
              paidAt: new Date(),
            },
          });
        } else {
          await tx.saaSSubscription.create({
            data: {
              userId: updated.id,
              publicPlanId: selectedPlan.id,
              status: "PAID",
              provider: "SUPERADMIN_MANUAL",
              providerPreferenceId: null,
              providerPaymentId: "manual",
              externalReference: manualExternalReference,
              checkoutUrl: null,
              paidAt: new Date(),
            },
          });
        }
      } else {
        await tx.saaSSubscription.updateMany({
          where: {
            userId: updated.id,
            provider: "SUPERADMIN_MANUAL",
          },
          data: {
            status: "CANCELLED",
          },
        });
      }
    }

    return updated;
  });

  return NextResponse.json({
    ok: true,
    message: "Usuario atualizado com sucesso.",
    user: result,
  });
}