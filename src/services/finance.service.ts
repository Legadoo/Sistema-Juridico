import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type FinanceType = "INCOME" | "EXPENSE";

type SessionUser = {
  id: string;
  name: string;
  role: string;
  firmId: string | null;
};

type FinanceInput = {
  type: FinanceType;
  category: string;
  amount: number;
  description?: string | null;
  occurredAt?: string | Date | null;
  paymentMethod?: string | null;
  clientId?: string | null;
  processId?: string | null;
  processNumber?: string | null;
  attachmentUrl?: string | null;
};

function canManageFinances(role: string) {
  return role === "MASTER" || role === "SECRETARY" || role === "SUPERADMIN";
}

function assertUser(user: SessionUser) {
  if (!user) {
    throw new Error("Não autenticado.");
  }

  if (!canManageFinances(user.role)) {
    throw new Error("Sem permissão para acessar finanças.");
  }

  if (!user.firmId) {
    throw new Error("Usuário sem advocacia vinculada.");
  }
}

function normalizeType(type: unknown): FinanceType {
  return type === "EXPENSE" ? "EXPENSE" : "INCOME";
}

function normalizeAmount(value: unknown) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Valor inválido.");
  }

  return Number(numeric.toFixed(2));
}

function normalizeDate(value?: string | Date | null) {
  if (!value) return new Date();

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Data inválida.");
  }

  return date;
}

export async function syncPaidChargesToFinance(firmId: string) {
  const paidCharges = await prisma.charge.findMany({
    where: {
      firmId,
      status: "PAID",
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      process: {
        select: {
          id: true,
          cnj: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  for (const charge of paidCharges) {
    const existing = await prisma.financeTransaction.findUnique({
      where: {
        chargeId: charge.id,
      },
      select: {
        id: true,
      },
    });

    if (existing) continue;

    const amount = Number(charge.currentAmount ?? charge.amount ?? 0);

    if (!Number.isFinite(amount) || amount <= 0) continue;

    await prisma.financeTransaction.create({
      data: {
        firmId,
        type: "INCOME",
        category: "Honorários",
        amount: new Prisma.Decimal(amount),
        description: charge.message || "Entrada automática de cobrança paga",
        occurredAt: charge.paidAt || new Date(),
        paymentMethod: "Mercado Pago",
        clientId: charge.clientId,
        clientName: charge.client?.name || null,
        processId: charge.processId || null,
        processNumber: charge.process?.cnj || null,
        chargeId: charge.id,
        createdByUserId: charge.createdByUserId,
        createdByUserName: charge.createdByUser?.name || null,
        isAutomatic: true,
      },
    });
  }
}

export async function listFinanceTransactions(user: SessionUser) {
  assertUser(user);

  await syncPaidChargesToFinance(user.firmId!);

  return prisma.financeTransaction.findMany({
    where: {
      firmId: user.firmId!,
    },
    orderBy: {
      occurredAt: "desc",
    },
  });
}

export async function createFinanceTransaction(user: SessionUser, input: FinanceInput) {
  assertUser(user);

  const type = normalizeType(input.type);
  const amount = normalizeAmount(input.amount);
  const category = (input.category || "").trim();

  if (!category) {
    throw new Error("Informe a categoria.");
  }

  let clientName: string | null = null;

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: {
        id: input.clientId,
        firmId: user.firmId!,
      },
      select: {
        name: true,
      },
    });

    clientName = client?.name || null;
  }

  let processNumber = input.processNumber?.trim() || null;

  if (input.processId) {
    const process = await prisma.legalProcess.findFirst({
      where: {
        id: input.processId,
        firmId: user.firmId!,
      },
      select: {
        cnj: true,
      },
    });

    processNumber = process?.cnj || processNumber;
  }

  return prisma.financeTransaction.create({
    data: {
      firmId: user.firmId!,
      type,
      category,
      amount: new Prisma.Decimal(amount),
      description: input.description?.trim() || null,
      occurredAt: normalizeDate(input.occurredAt),
      paymentMethod: input.paymentMethod?.trim() || null,
      clientId: input.clientId || null,
      clientName,
      processId: input.processId || null,
      processNumber,
      createdByUserId: user.id,
      createdByUserName: user.name,
      attachmentUrl: input.attachmentUrl?.trim() || null,
      isAutomatic: false,
    },
  });
}

export async function updateFinanceTransaction(
  user: SessionUser,
  transactionId: string,
  input: FinanceInput
) {
  assertUser(user);

  const existing = await prisma.financeTransaction.findFirst({
    where: {
      id: transactionId,
      firmId: user.firmId!,
    },
  });

  if (!existing) {
    throw new Error("Movimentação não encontrada.");
  }

  if (existing.isAutomatic) {
    throw new Error("Movimentações automáticas de cobranças pagas não podem ser editadas.");
  }

  const type = normalizeType(input.type);
  const amount = normalizeAmount(input.amount);
  const category = (input.category || "").trim();

  if (!category) {
    throw new Error("Informe a categoria.");
  }

  let clientName: string | null = null;

  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: {
        id: input.clientId,
        firmId: user.firmId!,
      },
      select: {
        name: true,
      },
    });

    clientName = client?.name || null;
  }

  let processNumber = input.processNumber?.trim() || null;

  if (input.processId) {
    const process = await prisma.legalProcess.findFirst({
      where: {
        id: input.processId,
        firmId: user.firmId!,
      },
      select: {
        cnj: true,
      },
    });

    processNumber = process?.cnj || processNumber;
  }

  return prisma.financeTransaction.update({
    where: {
      id: transactionId,
    },
    data: {
      type,
      category,
      amount: new Prisma.Decimal(amount),
      description: input.description?.trim() || null,
      occurredAt: normalizeDate(input.occurredAt),
      paymentMethod: input.paymentMethod?.trim() || null,
      clientId: input.clientId || null,
      clientName,
      processId: input.processId || null,
      processNumber,
      attachmentUrl: input.attachmentUrl?.trim() || null,
    },
  });
}

export async function deleteFinanceTransaction(user: SessionUser, transactionId: string) {
  assertUser(user);

  const existing = await prisma.financeTransaction.findFirst({
    where: {
      id: transactionId,
      firmId: user.firmId!,
    },
  });

  if (!existing) {
    throw new Error("Movimentação não encontrada.");
  }

  if (existing.isAutomatic) {
    throw new Error("Movimentações automáticas de cobranças pagas não podem ser excluídas.");
  }

  await prisma.financeTransaction.delete({
    where: {
      id: transactionId,
    },
  });

  return true;
}