import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  createChargeForFirm,
  listChargesForFirm,
} from "@/services/charge.service";

function ensureLawFirmUser(user: { role: string; firmId?: string | null }) {
  return user.role === "MASTER" || user.role === "SECRETARY";
}

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 },
      );
    }

    if (!ensureLawFirmUser(user) || !user.firmId) {
      return NextResponse.json(
        { ok: false, message: "Acesso negado." },
        { status: 403 },
      );
    }

    const charges = await listChargesForFirm({
      firmId: user.firmId,
    });

    return NextResponse.json({
      ok: true,
      data: charges,
    });
  } catch (error) {
    console.error("GET admin charges error:", error);
    return NextResponse.json(
      { ok: false, message: "Falha ao listar cobranças." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 },
      );
    }

    if (!ensureLawFirmUser(user) || !user.firmId) {
      return NextResponse.json(
        { ok: false, message: "Acesso negado." },
        { status: 403 },
      );
    }

    const body = await request.json();

    const clientId =
      typeof body.clientId === "string" ? body.clientId.trim() : "";
    const processId =
      typeof body.processId === "string" && body.processId.trim()
        ? body.processId.trim()
        : null;
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : null;

    const rawAmount =
      typeof body.amount === "number"
        ? body.amount
        : typeof body.amount === "string"
          ? Number(body.amount)
          : NaN;

    if (!clientId) {
      return NextResponse.json(
        { ok: false, message: "clientId é obrigatório." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return NextResponse.json(
        { ok: false, message: "Valor da cobrança inválido." },
        { status: 400 },
      );
    }

    const charge = await createChargeForFirm({
      actorUserId: user.id,
      firmId: user.firmId,
      clientId,
      processId,
      amount: rawAmount,
      message,
    });

    return NextResponse.json({
      ok: true,
      data: charge,
      message: "Cobrança criada com sucesso.",
    });
  } catch (error) {
    console.error("POST admin charges error:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao criar cobrança.",
      },
      { status: 500 },
    );
  }
}