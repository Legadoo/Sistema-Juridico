import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (!(user.role === "SUPERADMIN" || user.role === "MASTER" || user.role === "SECRETARY")) {
    return NextResponse.json({ ok: false, message: "Apenas SUPERADMIN pode editar cliente." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const clientId = (body?.clientId ?? "").toString().trim();
  const name = (body?.name ?? "").toString().trim();
  const document = onlyDigits((body?.document ?? "").toString());
  const phone = (body?.phone ?? "").toString().trim();
  const email = (body?.email ?? "").toString().trim();

  if (!clientId) return NextResponse.json({ ok: false, message: "clientId obrigatório." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (document) data.document = document;
  data.phone = phone || null;
  data.email = email || null;

  const updated = await prisma.client.update({
    where: { id: clientId },
    data,
  });

  return NextResponse.json({ ok: true, client: updated });
}

