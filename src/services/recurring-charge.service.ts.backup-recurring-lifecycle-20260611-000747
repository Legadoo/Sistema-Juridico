import { prisma } from "@/lib/prisma";
import { decryptText } from "@/lib/crypto";
import { createMercadoPagoPreference } from "@/services/mercado-pago.service";
import { sendChargeEmail } from "@/services/charge-email.service";
import { Prisma } from "@prisma/client";

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
  paymentValidityDays?: number | null;
  lateFeeType?: string | null;
  lateFeeValue?: number | null;
};

function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits || null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

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

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function calculateRawInstallmentAmount(
  totalAmount: number,
  installments: number,
  installmentNumber: number
) {
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / installments);
  const remainder = totalCents - baseCents * installments;

  const cents =
    installmentNumber === installments ? baseCents + remainder : baseCents;

  return cents / 100;
}

function calculateInstallmentAmount(
  totalAmount: number,
  installments: number,
  installmentNumber: number,
  hasInterest: boolean,
  interestPercent?: number | null,
  interestStartsAtInstallment?: number | null
) {
  const baseInstallment = calculateRawInstallmentAmount(
    totalAmount,
    installments,
    installmentNumber
  );

  if (!hasInterest) return Number(baseInstallment.toFixed(2));

  if (!interestPercent || !interestStartsAtInstallment) {
    return Number(baseInstallment.toFixed(2));
  }

  if (installmentNumber < interestStartsAtInstallment) {
    return Number(baseInstallment.toFixed(2));
  }

  return Number((baseInstallment * (1 + interestPercent / 100)).toFixed(2));
}

function normalizePaymentValidityDays(value?: number | null) {
  const numeric = Number(value ?? 3);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 3;
  }

  return Math.max(1, Math.floor(numeric));
}

function normalizeLateFeeType(value?: string | null) {
  return value === "PERCENT" || value === "FIXED" ? value : "NONE";
}

function normalizeLateFeeValue(type: string, value?: number | null) {
  if (type === "NONE") return null;

  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function calculateExpiresAt(baseDate: Date, paymentValidityDays: number) {
  const expiresAt = new Date(baseDate);
  expiresAt.setDate(expiresAt.getDate() + paymentValidityDays);
  expiresAt.setHours(23, 59, 59, 999);
  return expiresAt;
}

function calculateLateAmount(
  baseAmount: number,
  lateFeeType?: string | null,
  lateFeeValue?: number | null
) {
  const type = normalizeLateFeeType(lateFeeType);
  const value = normalizeLateFeeValue(type, lateFeeValue);

  if (type === "NONE" || !value) {
    return {
      increaseAmount: 0,
      finalAmount: Number(baseAmount.toFixed(2)),
    };
  }

  if (type === "PERCENT") {
    const increaseAmount = Number((baseAmount * (value / 100)).toFixed(2));
    return {
      increaseAmount,
      finalAmount: Number((baseAmount + increaseAmount).toFixed(2)),
    };
  }

  const increaseAmount = Number(value.toFixed(2));

  return {
    increaseAmount,
    finalAmount: Number((baseAmount + increaseAmount).toFixed(2)),
  };
}

async function getGatewayCredentials(firmId: string) {
  const gatewayConfig = await prisma.paymentGatewayConfig.findUnique({
    where: { firmId },
  });

  if (
    !gatewayConfig ||
    !gatewayConfig.isActive ||
    !gatewayConfig.enabledBySuperadmin ||
    !gatewayConfig.accessTokenEnc
  ) {
    throw new Error("FIRM_MERCADO_PAGO_NOT_CONFIGURED");
  }

  return {
    accessToken: decryptText(gatewayConfig.accessTokenEnc),
    publicKey: gatewayConfig.publicKeyEnc
      ? decryptText(gatewayConfig.publicKeyEnc)
      : null,
  };
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
    const dueDate = new Date(input.firstChargeDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    result.push({
      installmentNumber: i,
      amount: calculateInstallmentAmount(
        input.baseAmount,
        input.installments,
        i,
        input.hasInterest,
        input.interestPercent,
        input.interestStartsAtInstallment
      ),
      dueDate,
    });
  }

  return result;
}

async function createChargeForInstallment(params: {
  firmId: string;
  recurringChargeId: string;
  clientId: string;
  createdByUserId: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  actorPhone?: string | null;
  description: string;
  installmentId: string;
  installmentNumber: number;
  installments: number;
  amount: number;
  dueDate: Date;
  expiresAt: Date;
  lateFeeType?: string | null;
  lateFeeValue?: number | null;
  previousChargeId?: string | null;
}) {
  const credentials = await getGatewayCredentials(params.firmId);

  const externalReference = params.previousChargeId
    ? `charge_late_${params.installmentId}_${Date.now()}`
    : params.installmentId;

  const preference = await createMercadoPagoPreference(credentials, {
    title: `Parcela ${params.installmentNumber}/${params.installments} - ${params.clientName}`,
    amount: params.amount,
    externalReference,
    payerEmail: params.clientEmail ?? null,
    description: params.description,
    expiresAt: params.expiresAt,
  });

  const paymentUrl =
    preference.paymentUrl ??
    preference.initPoint ??
    preference.sandboxInitPoint ??
    null;

  const createdCharge = await prisma.charge.create({
    data: {
      firmId: params.firmId,
      clientId: params.clientId,
      processId: null,
      createdByUserId: params.createdByUserId,
      provider: "MERCADO_PAGO",
      providerPreferenceId: preference.providerPreferenceId,
      externalReference,
      amount: new Prisma.Decimal(params.amount),
      originalAmount: new Prisma.Decimal(params.amount),
      currentAmount: new Prisma.Decimal(params.amount),
      dueDate: params.dueDate,
      paymentValidityDays: Math.max(
        1,
        Math.ceil((params.expiresAt.getTime() - params.dueDate.getTime()) / 86400000)
      ),
      expiresAt: params.expiresAt,
      message: `${params.description} - Parcela ${params.installmentNumber}/${params.installments}`,
      status: "PENDING",
      paymentUrl,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      lateFeeType: params.lateFeeType ?? "NONE",
      lateFeeValue: params.lateFeeValue ?? null,
      lateFeeApplied: Boolean(params.previousChargeId),
      lateFeeAppliedAt: params.previousChargeId ? new Date() : null,
      previousChargeId: params.previousChargeId ?? null,
      emailTarget: params.clientEmail ?? null,
      phoneTarget: normalizePhone(params.clientPhone ?? null),
    },
  });

  await prisma.recurringChargeInstallment.update({
    where: { id: params.installmentId },
    data: {
      mercadoPagoPaymentId: preference.providerPreferenceId,
      mercadoPagoInitPoint: paymentUrl,
      expiresAt: params.expiresAt,
      lateFeeType: params.lateFeeType ?? "NONE",
      lateFeeValue: params.lateFeeValue ?? null,
      lateFeeApplied: Boolean(params.previousChargeId),
      lateFeeAppliedAt: params.previousChargeId ? new Date() : null,
    },
  });

  if (params.clientEmail && paymentUrl) {
    try {
      await sendChargeEmail({
        to: params.clientEmail,
        clientName: params.clientName,
        amount: formatCurrency(params.amount),
        dueDate: params.dueDate,
        lawyerName: params.actorName ?? null,
        lawyerEmail: params.actorEmail ?? null,
        lawyerPhone: params.actorPhone ?? null,
        paymentUrl,
      });

      await Promise.all([
        prisma.recurringChargeInstallment.update({
          where: { id: params.installmentId },
          data: { emailSentAt: new Date() },
        }),
        prisma.charge.update({
          where: { id: createdCharge.id },
          data: { emailSentAt: new Date() },
        }),
      ]);
    } catch (error) {
      console.error("sendChargeEmail recurring error:", error);
    }
  }

  return createdCharge;
}

export async function createRecurringCharge(input: CreateRecurringChargeInput) {
  const [client, actor] = await Promise.all([
    prisma.client.findFirst({
      where: {
        id: input.clientId,
        firmId: input.firmId,
        archived: false,
      },
    }),
    prisma.user.findFirst({
      where: {
        id: input.createdByUserId,
        firmId: input.firmId,
        active: true,
      },
    }),
  ]);

  if (!client) throw new Error("CLIENT_NOT_FOUND");
  if (!actor) throw new Error("ACTOR_NOT_FOUND");
  if (input.installments < 2) throw new Error("INVALID_INSTALLMENTS");
  if (input.chargeDay < 1 || input.chargeDay > 28) throw new Error("INVALID_CHARGE_DAY");

  await getGatewayCredentials(input.firmId);

  const paymentValidityDays = normalizePaymentValidityDays(input.paymentValidityDays);
  const lateFeeType = normalizeLateFeeType(input.lateFeeType);
  const lateFeeValue = normalizeLateFeeValue(lateFeeType, input.lateFeeValue);

  const firstChargeDate = toDateAtChargeDay(input.chargeDay);
  const firstAmount = calculateInstallmentAmount(
    input.baseAmount,
    input.installments,
    1,
    input.hasInterest,
    input.interestPercent,
    input.interestStartsAtInstallment
  );

  const firstExpiresAt = calculateExpiresAt(firstChargeDate, paymentValidityDays);

  const recurring = await prisma.recurringCharge.create({
    data: {
      firmId: input.firmId,
      clientId: input.clientId,
      createdByUserId: input.createdByUserId,
      description: input.description,
      baseAmount: input.baseAmount,
      installments: input.installments,
      currentInstallment: 1,
      chargeDay: input.chargeDay,
      hasInterest: input.hasInterest,
      interestPercent: input.interestPercent ?? null,
      interestStartsAtInstallment: input.interestStartsAtInstallment ?? null,
      paymentValidityDays,
      lateFeeType,
      lateFeeValue,
      nextChargeDate: addMonths(firstChargeDate, 1),
      status: "ACTIVE",
    },
  });

  const firstInstallment = await prisma.recurringChargeInstallment.create({
    data: {
      recurringChargeId: recurring.id,
      installmentNumber: 1,
      amount: firstAmount,
      dueDate: firstChargeDate,
      expiresAt: firstExpiresAt,
      lateFeeType,
      lateFeeValue,
      lateFeeApplied: false,
      status: "PENDING",
    },
  });

  const firstCharge = await createChargeForInstallment({
    firmId: input.firmId,
    recurringChargeId: recurring.id,
    clientId: client.id,
    createdByUserId: input.createdByUserId,
    clientName: client.name,
    clientEmail: client.email,
    clientPhone: client.phone,
    actorName: actor.name,
    actorEmail: actor.email,
    actorPhone: actor.phone,
    description: input.description,
    installmentId: firstInstallment.id,
    installmentNumber: 1,
    installments: input.installments,
    amount: firstAmount,
    dueDate: firstChargeDate,
    expiresAt: firstExpiresAt,
    lateFeeType,
    lateFeeValue,
  });

  const preview = buildRecurringInstallmentsPreview({
    baseAmount: input.baseAmount,
    installments: input.installments,
    firstChargeDate,
    hasInterest: input.hasInterest,
    interestPercent: input.interestPercent,
    interestStartsAtInstallment: input.interestStartsAtInstallment,
  });

  return {
    recurring,
    firstInstallment,
    firstCharge,
    preview,
  };
}

export async function processRecurringBillingForFirm(firmId: string) {
  const now = new Date();

  const expiredCharges = await prisma.charge.findMany({
    where: {
      firmId,
      status: "PENDING",
      expiresAt: {
        lt: now,
      },
      lateFeeApplied: false,
    },
    include: {
      client: true,
      createdByUser: true,
    },
  });

  for (const charge of expiredCharges) {
    const lateFeeType = normalizeLateFeeType(charge.lateFeeType);
    const lateFeeValue = normalizeLateFeeValue(lateFeeType, charge.lateFeeValue);

    if (lateFeeType === "NONE" || !lateFeeValue) {
      await prisma.charge.update({
        where: { id: charge.id },
        data: {
          status: "EXPIRED",
          expiredAt: now,
        },
      });

      continue;
    }

    const installment = await prisma.recurringChargeInstallment.findFirst({
      where: {
        id: charge.externalReference,
        status: "PENDING",
      },
      include: {
        recurringCharge: true,
      },
    });

    if (!installment) {
      await prisma.charge.update({
        where: { id: charge.id },
        data: {
          status: "EXPIRED",
          expiredAt: now,
        },
      });

      continue;
    }

    const currentAmount = Number(charge.currentAmount ?? charge.amount);
    const late = calculateLateAmount(currentAmount, lateFeeType, lateFeeValue);
    const newExpiresAt = calculateExpiresAt(now, charge.paymentValidityDays ?? 3);

    await prisma.charge.update({
      where: { id: charge.id },
      data: {
        status: "EXPIRED",
        expiredAt: now,
      },
    });

    const replacement = await createChargeForInstallment({
      firmId,
      recurringChargeId: installment.recurringChargeId,
      clientId: charge.clientId,
      createdByUserId: charge.createdByUserId,
      clientName: charge.client?.name || "Cliente",
      clientEmail: charge.client?.email,
      clientPhone: charge.client?.phone,
      actorName: charge.createdByUser?.name,
      actorEmail: charge.createdByUser?.email,
      actorPhone: charge.createdByUser?.phone,
      description: installment.recurringCharge.description,
      installmentId: installment.id,
      installmentNumber: installment.installmentNumber,
      installments: installment.recurringCharge.installments,
      amount: late.finalAmount,
      dueDate: now,
      expiresAt: newExpiresAt,
      lateFeeType,
      lateFeeValue,
      previousChargeId: charge.id,
    });

    await Promise.all([
      prisma.charge.update({
        where: { id: charge.id },
        data: {
          replacedByChargeId: replacement.id,
        },
      }),
      prisma.recurringChargeInstallment.update({
        where: { id: installment.id },
        data: {
          amount: late.finalAmount,
          lateFeeAmount: late.increaseAmount,
          lateFeeApplied: true,
          lateFeeAppliedAt: now,
          expiresAt: newExpiresAt,
        },
      }),
    ]);
  }

  const recurringCharges = await prisma.recurringCharge.findMany({
    where: {
      firmId,
      status: "ACTIVE",
      nextChargeDate: {
        lte: now,
      },
    },
    include: {
      client: true,
      createdByUser: true,
      installmentsGenerated: {
        orderBy: {
          installmentNumber: "desc",
        },
        take: 1,
      },
    },
  });

  for (const recurring of recurringCharges) {
    const lastInstallment = recurring.installmentsGenerated[0] ?? null;

    if (!lastInstallment) continue;

    if (
      recurring.currentInstallment >= recurring.installments &&
      lastInstallment.status === "PAID"
    ) {
      await prisma.recurringCharge.update({
        where: { id: recurring.id },
        data: { status: "COMPLETED" },
      });

      continue;
    }

    if (lastInstallment.status !== "PAID") {
      continue;
    }

    const nextNumber = recurring.currentInstallment + 1;

    if (nextNumber > recurring.installments) {
      await prisma.recurringCharge.update({
        where: { id: recurring.id },
        data: { status: "COMPLETED" },
      });

      continue;
    }

    const alreadyExists = await prisma.recurringChargeInstallment.findUnique({
      where: {
        recurringChargeId_installmentNumber: {
          recurringChargeId: recurring.id,
          installmentNumber: nextNumber,
        },
      },
    });

    if (alreadyExists) continue;

    const dueDate = new Date(recurring.nextChargeDate);
    const expiresAt = calculateExpiresAt(dueDate, recurring.paymentValidityDays);

    const amount = calculateInstallmentAmount(
      recurring.baseAmount,
      recurring.installments,
      nextNumber,
      recurring.hasInterest,
      recurring.interestPercent,
      recurring.interestStartsAtInstallment
    );

    const installment = await prisma.recurringChargeInstallment.create({
      data: {
        recurringChargeId: recurring.id,
        installmentNumber: nextNumber,
        amount,
        dueDate,
        expiresAt,
        lateFeeType: recurring.lateFeeType,
        lateFeeValue: recurring.lateFeeValue,
        lateFeeApplied: false,
        status: "PENDING",
      },
    });

    await createChargeForInstallment({
      firmId,
      recurringChargeId: recurring.id,
      clientId: recurring.clientId,
      createdByUserId: recurring.createdByUserId,
      clientName: recurring.client.name,
      clientEmail: recurring.client.email,
      clientPhone: recurring.client.phone,
      actorName: recurring.createdByUser.name,
      actorEmail: recurring.createdByUser.email,
      actorPhone: recurring.createdByUser.phone,
      description: recurring.description,
      installmentId: installment.id,
      installmentNumber: nextNumber,
      installments: recurring.installments,
      amount,
      dueDate,
      expiresAt,
      lateFeeType: recurring.lateFeeType,
      lateFeeValue: recurring.lateFeeValue,
    });

    await prisma.recurringCharge.update({
      where: { id: recurring.id },
      data: {
        currentInstallment: nextNumber,
        nextChargeDate: addMonths(dueDate, 1),
      },
    });
  }
}