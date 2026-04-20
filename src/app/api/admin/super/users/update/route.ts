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
      { ok: false, message: "Preencha os campos obrigatórios." },
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
    },
  });

  if (!target) {
    return NextResponse.json(
      { ok: false, message: "Usuário não encontrado." },
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
      { ok: false, message: "Já existe outro usuário com este e-mail." },
      { status: 409 }
    );
  }

  let selectedPlanNameSnapshot: string | null = null;

  if (selectedPlanId) {
    const selectedPlan = await prisma.publicPlan.findUnique({
      where: { id: selectedPlanId },
      select: { id: true, name: true },
    });

    if (!selectedPlan) {
      return NextResponse.json(
        { ok: false, message: "Plano selecionado não encontrado." },
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
        { ok: false, message: "Advocacia selecionada não encontrada." },
        { status: 400 }
      );
    }
  }

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

    if (firmId && active && target.emailVerified && onboardingStatus === "ACTIVE") {
      onboardingStatus = "ACTIVE";
    }

    if (!firmId && onboardingStatus === "ACTIVE") {
      onboardingStatus = "FIRM_REQUIRED";
    }

    data.onboardingStatus = onboardingStatus;
  }

  const updated = await prisma.user.update({
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

  return NextResponse.json({
    ok: true,
    message: "Usuário atualizado com sucesso.",
    user: updated,
  });
}