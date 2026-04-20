import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import bcrypt from "bcryptjs";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 401 });

  if (actor.role !== "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "Apenas SUPERADMIN pode criar advocacias." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);

  const name = (body?.name ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim().toLowerCase();
  const password = (body?.password ?? "").toString();
  const slugInput = (body?.slug ?? "").toString().trim();

  if (!name || !email || !password) {
    return NextResponse.json(
      { ok: false, message: "Preencha nome da advocacia, e-mail e senha." },
      { status: 400 }
    );
  }

  const slug = slugify(slugInput || name);

  if (!slug) {
    return NextResponse.json(
      { ok: false, message: "Não foi possível gerar um slug válido." },
      { status: 400 }
    );
  }

  const existingFirm = await prisma.lawFirm.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingFirm) {
    return NextResponse.json(
      { ok: false, message: "Já existe uma advocacia com este identificador." },
      { status: 409 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { ok: false, message: "Já existe um usuário com este e-mail." },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, 10);

  const firm = await prisma.lawFirm.create({
    data: {
      name,
      slug,
      active: true,
    },
  });

  await prisma.firmConfig.create({
    data: {
      firmId: firm.id,
      maxClients: 50,
    },
  });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role: "MASTER",
      active: true,
      firmId: firm.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      firmId: true,
    },
  });

  return NextResponse.json({
    ok: true,
    firm: {
      id: firm.id,
      name: firm.name,
      slug: firm.slug,
    },
    user,
  });
}
