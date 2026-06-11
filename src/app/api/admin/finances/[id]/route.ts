import { NextResponse } from "next/server";
import { ensureAdminModuleResponse } from "@/lib/admin/moduleAccess";
import { getSessionUser } from "@/lib/session";
import {
  deleteFinanceTransaction,
  updateFinanceTransaction,
} from "@/services/finance.service";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const moduleGuard = await ensureAdminModuleResponse("moduleFinances");
  if (moduleGuard) return moduleGuard;

  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  const params = await context.params;
  const body = await req.json().catch(() => null);

  try {
    const transaction = await updateFinanceTransaction(user, params.id, {
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
      message: "Movimentação atualizada com sucesso.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar movimentação.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const moduleGuard = await ensureAdminModuleResponse("moduleFinances");
  if (moduleGuard) return moduleGuard;

  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Não autenticado." },
      { status: 401 }
    );
  }

  const params = await context.params;

  try {
    await deleteFinanceTransaction(user, params.id);

    return NextResponse.json({
      ok: true,
      message: "Movimentação excluída com sucesso.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir movimentação.";

    return NextResponse.json(
      { ok: false, message },
      { status: 400 }
    );
  }
}