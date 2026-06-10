import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import {
  listProcessesByFirm,
  createProcessForFirm,
} from "@/services/process.service";

export async function GET(req: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!user.firmId) {
    return NextResponse.json(
      { ok: false, message: "Usuário sem advocacia vinculada." },
      { status: 403 }
    );
  }

  try {
    const url = new URL(req.url);
    const archived = url.searchParams.get("archived") === "1";
    const clientId = url.searchParams.get("clientId")?.trim() || "";

    const processes = await listProcessesByFirm(user.firmId, {
      archived,
      clientId,
    });

    return NextResponse.json({
      ok: true,
      processes,
    });
  } catch (error) {
    console.error("GET /api/admin/processes error:", error);

    return NextResponse.json(
      { ok: false, message: "Erro ao listar processos." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleProcesses");
  if (moduleGuard) return moduleGuard;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!user.firmId) {
    return NextResponse.json(
      { ok: false, message: "Usuário sem advocacia vinculada." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json().catch(() => null);

    const created = await createProcessForFirm(user.firmId, {
      cnj: (body?.cnj ?? "").toString(),
      clientId: (body?.clientId ?? "").toString(),
      notes: body?.notes,
      tribunal: body?.tribunal,
      vara: body?.vara,
      status: body?.status,
      startDate: body?.startDate,
    });

    return NextResponse.json({
      ok: true,
      process: created,
      message: "Processo criado com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível criar o processo.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}