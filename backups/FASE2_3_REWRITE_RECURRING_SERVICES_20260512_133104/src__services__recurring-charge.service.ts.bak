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
    installmentNumber === installments
      ? baseCents + remainder
      : baseCents;

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

  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }

  if (!actor) {
    throw new Error("ACTOR_NOT_FOUND");
  }

  if (input.installments < 2) {
    throw new Error("INVALID_INSTALLMENTS");
  }

  if (input.chargeDay < 1 || input.chargeDay > 28) {
    throw new Error("INVALID_CHARGE_DAY");
  }

  const gatewayConfig = await prisma.paymentGatewayConfig.findUnique({
    where: { firmId: input.firmId },
  });

  if (
    !gatewayConfig ||
    !gatewayConfig.isActive ||
    !gatewayConfig.enabledBySuperadmin ||
    !gatewayConfig.accessTokenEnc
  ) {
    throw new Error("FIRM_MERCADO_PAGO_NOT_CONFIGURED");
  }

  const credentials = {
    accessToken: decryptText(gatewayConfig.accessTokenEnc),
    publicKey: gatewayConfig.publicKeyEnc
      ? decryptText(gatewayConfig.publicKeyEnc)
      : null,
  };

  const firstChargeDate = toDateAtChargeDay(input.chargeDay);
  const firstAmount = calculateInstallmentAmount(
    input.baseAmount,
    input.installments,
    1,
    input.hasInterest,
    input.interestPercent,
    input.interestStartsAtInstallment
  );

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
      status: "PENDING",
    },
  });

  const preference = await createMercadoPagoPreference(credentials, {
    title: `Parcela 1/${input.installments} - ${client.name}`,
    amount: firstAmount,
    externalReference: firstInstallment.id,
    payerEmail: client.email ?? null,
    description: input.description,
  });

  const paymentUrl =
    preference.paymentUrl ?? preference.initPoint ?? preference.sandboxInitPoint ?? null;

  const updatedInstallment = await prisma.recurringChargeInstallment.update({
    where: { id: firstInstallment.id },
    data: {
      mercadoPagoPaymentId: preference.providerPreferenceId,
      mercadoPagoInitPoint: paymentUrl,
    },
  });

  const createdCharge = await prisma.charge.create({
    data: {
      firmId: input.firmId,
      clientId: client.id,
      processId: null,
      createdByUserId: input.createdByUserId,
      provider: "MERCADO_PAGO",
      providerPreferenceId: preference.providerPreferenceId,
      externalReference: firstInstallment.id,
      amount: new Prisma.Decimal(firstAmount),
      dueDate: firstChargeDate,
      message: `${input.description} - Parcela 1/${input.installments}`,
      status: "PENDING",
      paymentUrl,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      emailTarget: client.email ?? null,
      phoneTarget: normalizePhone(client.phone ?? null),
    },
  });

  if (client.email && paymentUrl) {
    try {
      await sendChargeEmail({
        to: client.email,
        clientName: client.name ?? null,
        amount: formatCurrency(firstAmount),
        dueDate: firstChargeDate,
        lawyerName: actor.name ?? null,
        lawyerEmail: actor.email ?? null,
        lawyerPhone: actor.phone ?? null,
        paymentUrl,
      });

      await Promise.all([
        prisma.recurringChargeInstallment.update({
          where: { id: updatedInstallment.id },
          data: {
            emailSentAt: new Date(),
          },
        }),
        prisma.charge.update({
          where: { id: createdCharge.id },
          data: {
            emailSentAt: new Date(),
          },
        }),
      ]);
    } catch (error) {
      console.error("sendChargeEmail recurring create error:", error);
    }
  }

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
    firstInstallment: updatedInstallment,
    firstCharge: createdCharge,
    preview,
  };
}