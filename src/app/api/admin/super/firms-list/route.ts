import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const actor = await getSessionUser();

  if (!actor || actor.role !== "SUPERADMIN") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const firms = await prisma.lawFirm.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      active: true,
    },
  });

  return NextResponse.json({ ok: true, firms });
}