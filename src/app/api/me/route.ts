import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, destroySession } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let firm = null;

  if (user.firmId) {
    firm = await prisma.lawFirm.findUnique({
      where: { id: user.firmId },
      select: {
        id: true,
        name: true,
        slug: true,
        active: true,
      },
    });

    if (user.role !== "SUPERADMIN" && (!firm || !firm.active)) {
      await destroySession();
      return NextResponse.json(
        {
          ok: false,
          message: "Advocacia desativada.",
        },
        { status: 401 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      firmId: user.firmId,
    },
    firm,
  });
}