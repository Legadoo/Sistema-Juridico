import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import {
  listActiveClientsByFirm,
  createClientForFirm,
} from "@/services/client.service";

export async function GET() {
  const moduleGuard = await ensureAdminModuleResponse("moduleClients");
  if (moduleGuard) return moduleGuard;
  try {
    const user = await getSessionUser();

    if (!user || !user.firmId) {
      return NextResponse.json(
        { ok: false, message: "Não autorizado." },
        { status: 401 }
      );
    }

    const clients = await listActiveClientsByFirm(user.firmId);

    return NextResponse.json({
      ok: true,
      clients,
    });
  } catch (error) {
    console.error("GET /api/admin/clients error:", error);

    return NextResponse.json(
      { ok: false, message: "Erro ao listar clientes." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleClients");
  if (moduleGuard) return moduleGuard;
  try {
    const user = await getSessionUser();

    if (!user || !user.firmId) {
      return NextResponse.json(
        { ok: false, message: "Não autorizado." },
        { status: 401 }
      );
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

    return NextResponse.json({
      ok: true,
      client,
      message: "Cliente criado com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar cliente.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}