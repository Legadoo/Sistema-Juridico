import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") ?? "").trim();

  if (!token) {
    return NextResponse.redirect(new URL("/login?verified=invalid", req.url));
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
    },
    select: {
      id: true,
      emailVerified: true,
      emailVerificationExpiresAt: true,
    },
  });

  if (!user) {
    return NextResponse.redirect(new URL("/login?verified=invalid", req.url));
  }

  if (user.emailVerified) {
    await createSession(user.id);
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/login?verified=expired", req.url));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  await createSession(user.id);

  return NextResponse.redirect(new URL("/", req.url));
}