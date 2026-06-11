import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import {
  createFinanceTransaction,
  listFinanceTransactions,
} from "@/services/finance.service";

export async function GET() {
  const moduleGuard = await ensureAdminModuleResponse("moduleFinances");
  if (moduleGuard) return moduleGuard;

  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  try {
    const transactions = await listFinanceTransactions(user);

    return NextResponse.json({
      ok: true,
      transactions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao listar finanças.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  const moduleGuard = await ensureAdminModuleResponse("moduleFinances");
  if (moduleGuard) return moduleGuard;

  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);

  try {
    const transaction = await createFinanceTransaction(user, {
      type: body?.type,
      category: body?.category,
      amount: Number(body?.amount),
      description: body?.description,
      occurredAt: body?.occurredAt,
      paymentMethod: body?.paymentMethod,
      clientId: body?.clientId,
      processId: body?.processId,
      processNumber: body?.processNumber,
      attachmentUrl: body?.attachmentUrl,
    });

    return NextResponse.json({
      ok: true,
      transaction,
      message: "Movimentação criada com sucesso.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar movimentação.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}