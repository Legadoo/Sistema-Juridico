import { prisma } from "@/lib/prisma";

type CreateRecurringChargeInput = {
  firmId: string;
  clientId: string;
  createdByUserId: string;
  description: string;
  baseAmount: number;
  installments: number;
  chargeDay: number;
  hasInterest: boolean;
  interestPercent?: number | null;
  interestStartsAtInstallment?: number | null;
};

function toDateAtChargeDay(chargeDay: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const candidate = new Date(year, month, chargeDay, 9, 0, 0, 0);

  if (candidate < now) {
    return new Date(year, month + 1, chargeDay, 9, 0, 0, 0);
  }

  return candidate;
}

function calculateInstallmentAmount(
  baseAmount: number,
  installmentNumber: number,
  hasInterest: boolean,
  interestPercent?: number | null,
  interestStartsAtInstallment?: number | null
) {
  if (!hasInterest) return baseAmount;

  if (!interestPercent || !interestStartsAtInstallment) return baseAmount;

  if (installmentNumber < interestStartsAtInstallment) return baseAmount;

  return Number((baseAmount * (1 + interestPercent / 100)).toFixed(2));
}

export async function createRecurringCharge(input: CreateRecurringChargeInput) {
  const client = await prisma.client.findFirst({
    where: {
      id: input.clientId,
      firmId: input.firmId,
      archived: false,
    },
  });

  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }

  if (input.installments < 2) {
    throw new Error("INVALID_INSTALLMENTS");
  }

  if (input.chargeDay < 1 || input.chargeDay > 28) {
    throw new Error("INVALID_CHARGE_DAY");
  }

  const nextChargeDate = toDateAtChargeDay(input.chargeDay);

  const recurring = await prisma.recurringCharge.create({
    data: {
      firmId: input.firmId,
      clientId: input.clientId,
      createdByUserId: input.createdByUserId,
      description: input.description,
      baseAmount: input.baseAmount,
      installments: input.installments,
      chargeDay: input.chargeDay,
      hasInterest: input.hasInterest,
      interestPercent: input.interestPercent ?? null,
      interestStartsAtInstallment: input.interestStartsAtInstallment ?? null,
      nextChargeDate,
      status: "ACTIVE",
    },
  });

  const firstAmount = calculateInstallmentAmount(
    input.baseAmount,
    1,
    input.hasInterest,
    input.interestPercent,
    input.interestStartsAtInstallment
  );

  const preview = buildRecurringInstallmentsPreview({
    baseAmount: input.baseAmount,
    installments: input.installments,
    firstChargeDate: nextChargeDate,
    hasInterest: input.hasInterest,
    interestPercent: input.interestPercent,
    interestStartsAtInstallment: input.interestStartsAtInstallment,
  });

  const firstInstallment = await prisma.recurringChargeInstallment.create({
    data: {
      recurringChargeId: recurring.id,
      installmentNumber: 1,
      amount: firstAmount,
      dueDate: nextChargeDate,
      status: "PENDING",
    },
  });

  return {
    recurring,
    firstInstallment,
    preview,
  };
}
function getInstallmentDueDate(firstDate: Date, installmentNumber: number) {
  const due = new Date(firstDate);
  due.setMonth(due.getMonth() + (installmentNumber - 1));
  return due;
}

export function buildRecurringInstallmentsPreview(input: {
  baseAmount: number;
  installments: number;
  firstChargeDate: Date;
  hasInterest: boolean;
  interestPercent?: number | null;
  interestStartsAtInstallment?: number | null;
}) {
  const result: Array<{
    installmentNumber: number;
    amount: number;
    dueDate: Date;
  }> = [];

  for (let i = 1; i <= input.installments; i++) {
    result.push({
      installmentNumber: i,
      amount: calculateInstallmentAmount(
        input.baseAmount,
        i,
        input.hasInterest,
        input.interestPercent,
        input.interestStartsAtInstallment
      ),
      dueDate: getInstallmentDueDate(input.firstChargeDate, i),
    });
  }

  return result;
}