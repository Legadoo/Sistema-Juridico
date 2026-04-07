import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const processes = await prisma.legalProcess.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  return NextResponse.json({ ok: true, processes });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  if (user.role !== "MASTER" && user.role !== "SUPERADMIN" && user.role !== "SECRETARY") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const clientId = (body?.clientId ?? "").toString().trim();
  const cnj = (body?.cnj ?? body?.number ?? body?.processNumber ?? "").toString().trim();

  // opcional: guardar "titulo" como anotação (notes), já que não existe title no model
  const notes = (body?.title ?? "").toString().trim() || null;

  if (!clientId || !cnj) {
    return NextResponse.json({ ok: false, message: "Preencha CNJ e Cliente." }, { status: 400 });
  }

  try {
    const created = await prisma.legalProcess.create({
      data: {
        cnj,
        clientId,
        notes, // se não quiser salvar nada, pode apagar essa linha
      },
    });

    return NextResponse.json({ ok: true, process: created });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, message: "Esse CNJ já está cadastrado." }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ ok: false, message: "Erro ao criar processo." }, { status: 500 });
  }
}
