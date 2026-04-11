import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  listActiveClientsByFirm,
  createClientForFirm,
} from "@/services/client.service";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user || !user.firmId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const clients = await listActiveClientsByFirm(user.firmId);

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("GET /api/admin/clients error:", error);
    return NextResponse.json(
      { error: "Erro ao listar clientes." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();

    if (!user || !user.firmId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = await req.json();

    const client = await createClientForFirm(
      {
        name: body.name,
        document: body.document,
        email: body.email,
        phone: body.phone,
        accessCode: body.accessCode,
      },
      user.firmId
    );

    return NextResponse.json({ client });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar cliente.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}