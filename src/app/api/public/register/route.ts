import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/services/email.service";

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const phone = (body?.phone ?? "").toString().trim();
  const password = (body?.password ?? "").toString();

  if (!name || !email || !password || !phone) {
    return NextResponse.json(
      { ok: false, message: "Preencha nome, telefone, e-mail e senha." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, message: "A senha deve ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  if (existing) {
    return NextResponse.json(
      { ok: false, message: "Já existe um cadastro com este e-mail." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: passwordHash,
      role: "MASTER",
      active: true,
      firmId: null,
      onboardingStatus: "PLAN_REQUIRED",
      selectedPlanId: null,
      selectedPlanNameSnapshot: null,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: expiresAt,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  });

  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: verificationToken,
  });

  return NextResponse.json({
    ok: true,
    message: "Cadastro realizado com sucesso. Verifique seu e-mail para ativar a conta.",
    data: {
      user,
      redirectTo: "/login",
    },
  });
}