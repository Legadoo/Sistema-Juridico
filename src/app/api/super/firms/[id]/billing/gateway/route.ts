import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getGatewayConfigForFirmBySuperadmin,
  saveGatewayConfigForFirmBySuperadmin,
  updateGatewayStatusForFirmBySuperadmin,
} from "@/services/charge.service";

function forbidden() {
  return NextResponse.json(
    { ok: false, message: "Acesso negado." },
    { status: 403 },
  );
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 },
      );
    }

    if (user.role !== "SUPERADMIN") {
      return forbidden();
    }

    const { id } = await context.params;
    const config = await getGatewayConfigForFirmBySuperadmin({ firmId: id });

    return NextResponse.json({
      ok: true,
      data: config,
    });
  } catch (error) {
    console.error("GET super billing gateway error:", error);
    return NextResponse.json(
      { ok: false, message: "Falha ao buscar configuração de cobrança." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 },
      );
    }

    if (user.role !== "SUPERADMIN") {
      return forbidden();
    }

    const body = await request.json();
    const { id } = await context.params;

    const accessToken =
      typeof body.accessToken === "string" ? body.accessToken.trim() : "";
    const publicKey =
      typeof body.publicKey === "string" ? body.publicKey.trim() : null;

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, message: "Access Token é obrigatório." },
        { status: 400 },
      );
    }

    const result = await saveGatewayConfigForFirmBySuperadmin({
      firmId: id,
      accessToken,
      publicKey,
      isActive: true,
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: result.id,
        firmId: result.firmId,
        provider: result.provider,
        isActive: result.isActive,
        enabledBySuperadmin: result.enabledBySuperadmin,
      },
      message: "Gateway configurado com sucesso.",
    });
  } catch (error) {
    console.error("POST super billing gateway error:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao configurar gateway.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Não autenticado." },
        { status: 401 },
      );
    }

    if (user.role !== "SUPERADMIN") {
      return forbidden();
    }

    const body = await request.json();
    const { id } = await context.params;

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { ok: false, message: "isActive deve ser boolean." },
        { status: 400 },
      );
    }

    const result = await updateGatewayStatusForFirmBySuperadmin({
      firmId: id,
      isActive: body.isActive,
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: result.id,
        firmId: result.firmId,
        isActive: result.isActive,
        enabledBySuperadmin: result.enabledBySuperadmin,
      },
      message: body.isActive
        ? "Gateway ativado com sucesso."
        : "Gateway desativado com sucesso.",
    });
  } catch (error) {
    console.error("PATCH super billing gateway error:", error);
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar gateway.",
      },
      { status: 500 },
    );
  }
}