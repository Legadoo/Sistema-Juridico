import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ ok: false }, { status: 401 });

  if (actor.role !== "SUPERADMIN") {
    return NextResponse.json(
      { ok: false, message: "Apenas SUPERADMIN pode listar planos globais." },
      { status: 403 }
    );
  }

  const plans = await prisma.publicPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isActive: true,
      isPurchasable: true,
    },
  });

  return NextResponse.json({ ok: true, plans });
}