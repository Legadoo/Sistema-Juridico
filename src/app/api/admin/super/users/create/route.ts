import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function onlyDigits(value: unknown) {
  return (value ?? "").toString().replace(/\D/g, "");
}

function normalizeRole(value: unknown) {
  const role = (value ?? "SECRETARY").toString().trim().toUpperCase();

  if (role === "MASTER") return "MASTER";
  if (role === "SUPERADMIN") return "SUPERADMIN";

  return "SECRETARY";
}

export async function POST(req: Request) {
  const actor = await getSessionUser();

  if (!actor || actor.role !== "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "Acesso negado." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);

  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const phone = (body?.phone ?? "").toString().trim();
  const document = onlyDigits(body?.document);
  const password = (body?.password ?? "").toString();
  const role = normalizeRole(body?.role);
  const firmId = (body?.firmId ?? "").toString().trim();
  const active = body?.active === undefined ? true : Boolean(body?.active);

  if (!name || !email || !password) {
    return NextResponse.json(
      { ok: false, message: "Nome, e-mail e senha são obrigatórios." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, message: "A senha precisa ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  if (role !== "SUPERADMIN" && !firmId) {
    return NextResponse.json(
      { ok: false, message: "Vincule o usuário a uma advocacia para liberar acesso ao admin." },
      { status: 400 }
    );
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingEmail) {
    return NextResponse.json(
      { ok: false, message: "Já existe usuário com este e-mail." },
      { status: 409 }
    );
  }

  if (firmId) {
    const firm = await prisma.lawFirm.findUnique({
      where: { id: firmId },
      select: { id: true, active: true },
    });

    if (!firm) {
      return NextResponse.json(
        { ok: false, message: "Advocacia selecionada não encontrada." },
        { status: 400 }
      );
    }

    if (!firm.active) {
      return NextResponse.json(
        { ok: false, message: "A advocacia selecionada está inativa." },
        { status: 400 }
      );
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      document: document || null,
      password: passwordHash,
      role,
      active,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      onboardingStatus: role === "SUPERADMIN" ? null : "ACTIVE",
      selectedPlanId: null,
      selectedPlanNameSnapshot: null,
      firmId: role === "SUPERADMIN" ? null : firmId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      document: true,
      role: true,
      active: true,
      emailVerified: true,
      onboardingStatus: true,
      firmId: true,
      firm: {
        select: {
          id: true,
          name: true,
          active: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Usuário criado com sucesso.",
    user,
  });
}
