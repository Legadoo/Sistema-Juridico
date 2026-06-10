import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function safeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function safePhone(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function safeAge(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return null;

  const age = Math.floor(parsed);

  if (age < 0 || age > 130) {
    throw new Error("Idade inválida.");
  }

  return age;
}

async function getAccountPayload(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      age: true,
      role: true,
      active: true,
      onboardingStatus: true,
      selectedPlanNameSnapshot: true,
      createdAt: true,
      updatedAt: true,
      firm: {
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
        },
      },
    },
  });

  if (!user) return null;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      age: user.age,
      role: user.role,
      active: user.active,
      onboardingStatus: user.onboardingStatus,
      selectedPlanNameSnapshot: user.selectedPlanNameSnapshot,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    firm: user.firm,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  const account = await getAccountPayload(sessionUser.id);

  if (!account) {
    return NextResponse.json(
      { ok: false, message: "Conta não encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    account,
  });
}

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, message: "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const name = safeText(body.name);
    const phone = safePhone(body.phone);
    const age = safeAge(body.age);

    if (!name) {
      return NextResponse.json(
        { ok: false, message: "O nome é obrigatório." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name,
        phone,
        age,
      },
    });

    const account = await getAccountPayload(sessionUser.id);

    return NextResponse.json({
      ok: true,
      message: "Conta atualizada com sucesso.",
      account,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível atualizar a conta.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}