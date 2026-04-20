import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import {
  createAvailabilityWindowForFirm,
  listAvailabilityWindowsForFirm,
} from "@/services/availability.service";

export async function GET() {
  const moduleGuard = await ensureAdminModuleResponse("moduleAvailability");
  if (moduleGuard) return moduleGuard;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  try {
    const windows = await listAvailabilityWindowsForFirm(user);
    return NextResponse.json({ ok: true, windows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao listar aberturas de agenda.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleAvailability");
  if (moduleGuard) return moduleGuard;
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  try {
    const window = await createAvailabilityWindowForFirm(user, {
      date: body?.date,
      startTime: body?.startTime,
      endTime: body?.endTime,
      slotIntervalMinutes: Number(body?.slotIntervalMinutes),
      notes: body?.notes,
    });

    return NextResponse.json({
      ok: true,
      window,
      message: "Abertura de agenda criada com sucesso.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao abrir agenda.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}