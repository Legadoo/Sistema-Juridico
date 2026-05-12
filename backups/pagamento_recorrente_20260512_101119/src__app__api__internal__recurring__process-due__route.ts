import { NextRequest, NextResponse } from "next/server";
import { processAllDueRecurringCharges } from "@/services/recurring-charge-processor.service";

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-internal-secret");
    const expectedSecret = process.env.INTERNAL_AUTOMATION_SECRET?.trim();

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { ok: false, message: "Acesso interno negado." },
        { status: 401 },
      );
    }

    const result = await processAllDueRecurringCharges();

    return NextResponse.json({
      ok: true,
      message: "Recorrências processadas com sucesso.",
      data: result.data,
    });
  } catch (error) {
    console.error("[POST /api/internal/recurring/process-due]", error);

    return NextResponse.json(
      { ok: false, message: "Erro ao processar recorrências automáticas." },
      { status: 500 },
    );
  }
}