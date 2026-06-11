import { Prisma } from "@prisma/client";
import { decryptText } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { createMercadoPagoPreference } from "@/services/mercado-pago.service";
import {
  sendChargeEmail,
  sendRecurringChargeLawyerNotification,
} from "@/services/charge-email.service";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function addMonthsFromPreviousDueDate(date: Date, months = 1) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function calculateExpiresAt(dueDate: Date, paymentValidityDays: number) {
  const expiresAt = new Date(dueDate);
  expiresAt.setDate(expiresAt.getDate() + paymentValidityDays);
  expiresAt.setHours(23, 59, 59, 999);
  return expiresAt;
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

function calculateInstallmentAmount(params: {
  totalAmount: number;
  installments: number;
  installmentNumber: number;
  hasInterest: boolean;
  interestPercent?: number | null;
  interestStartsAtInstallment?: number | null;
}) {
  const baseInstallment = calculateRawInstallmentAmount(
    params.totalAmount,
    params.installments,
    params.installmentNumber
  );

  if (!params.hasInterest) return Number(baseInstallment.toFixed(2));

  if (!params.interestPercent || !params.interestStartsAtInstallment) {
    return Number(baseInstallment.toFixed(2));
  }

  if (params.installmentNumber < params.interestStartsAtInstallment) {
    return Number(baseInstallment.toFixed(2));
  }

  return Number((baseInstallment * (1 + params.interestPercent / 100)).toFixed(2));
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
    throw new Error("Mercado Pago não configurado para esta advocacia.");
  }

  return {
    accessToken: decryptText(gatewayConfig.accessTokenEnc),
    publicKey: gatewayConfig.publicKeyEnc
      ? decryptText(gatewayConfig.publicKeyEnc)
      : null,
  };
}

async function sendEmailsForNextRecurringCharge(params: {
  clientEmail?: string | null;
  lawyerEmail?: string | null;
  clientName: string;
  lawyerName?: string | null;
  lawyerPhone?: string | null;
  amount: number;
  dueDate: Date;
  paymentUrl: string;
  installmentNumber: number;
  installments: number;
}) {
  if (params.clientEmail) {
    try {
      await sendChargeEmail({
        to: params.clientEmail,
        clientName: params.clientName,
        lawyerName: params.lawyerName,
        lawyerEmail: params.lawyerEmail,
        lawyerPhone: params.lawyerPhone,
        amount: formatCurrency(params.amount),
        dueDate: params.dueDate,
        paymentUrl: params.paymentUrl,
      });
    } catch (error) {
      console.error("Falha ao enviar cobrança recorrente para cliente:", error);
    }
  }

  if (params.lawyerEmail) {
    try {
      await sendRecurringChargeLawyerNotification({
        to: params.lawyerEmail,
        lawyerName: params.lawyerName,
        clientName: params.clientName,
        amount: formatCurrency(params.amount),
        dueDate: params.dueDate,
        installmentNumber: params.installmentNumber,
        installments: params.installments,
        paymentUrl: params.paymentUrl,
      });
    } catch (error) {
      console.error("Falha ao enviar aviso de recorrência para advogado:", error);
    }
  }
}

export async function advanceRecurringChargeFromPaidCharge(params: {
  chargeId: string;
  providerPaymentId?: string | null;
}) {
  const paidAt = new Date();

  const charge = await prisma.charge.findUnique({
    where: { id: params.chargeId },
    include: {
      client: true,
      createdByUser: true,
    },
  });

  if (!charge) {
    throw new Error("Cobrança não encontrada.");
  }

  if (charge.status === "PAID") {
    return {
      ok: true,
      alreadyPaid: true,
      message: "Cobrança já estava paga.",
    };
  }

  const installment = await prisma.recurringChargeInstallment.findFirst({
    where: {
      OR: [
        { id: charge.externalReference },
        { mercadoPagoPaymentId: charge.providerPreferenceId },
      ],
    },
    include: {
      recurringCharge: {
        include: {
          client: true,
          createdByUser: true,
        },
      },
    },
  });

  if (!installment) {
    const updated = await prisma.charge.update({
      where: { id: charge.id },
      data: {
        status: "PAID",
        paidAt,
        providerPaymentId: params.providerPaymentId ?? charge.providerPaymentId,
        lastWebhookAt: paidAt,
      },
    });

    return {
      ok: true,
      type: "SINGLE_CHARGE",
      charge: updated,
      message: "Cobrança única marcada como paga.",
    };
  }

  const recurring = installment.recurringCharge;

  await prisma.$transaction([
    prisma.charge.update({
      where: { id: charge.id },
      data: {
        status: "PAID",
        paidAt,
        providerPaymentId: params.providerPaymentId ?? charge.providerPaymentId,
        lastWebhookAt: paidAt,
      },
    }),
    prisma.recurringChargeInstallment.update({
      where: { id: installment.id },
      data: {
        status: "PAID",
        paidAt,
      },
    }),
    prisma.recurringCharge.update({
      where: { id: recurring.id },
      data: {
        lastPaidAt: paidAt,
        lastPaidInstallment: installment.installmentNumber,
      },
    }),
  ]);

  if (installment.installmentNumber >= recurring.installments) {
    const completed = await prisma.recurringCharge.update({
      where: { id: recurring.id },
      data: {
        status: "COMPLETED",
        currentStatus: "COMPLETED",
        currentChargeId: null,
        currentPaymentUrl: null,
        currentProviderPreferenceId: null,
        currentAmount: null,
        currentDueDate: null,
        currentExpiresAt: null,
      },
    });

    return {
      ok: true,
      type: "RECURRING_COMPLETED",
      recurring: completed,
      message: "Recorrência finalizada.",
    };
  }

  const nextNumber = installment.installmentNumber + 1;

  const existingNext = await prisma.recurringChargeInstallment.findUnique({
    where: {
      recurringChargeId_installmentNumber: {
        recurringChargeId: recurring.id,
        installmentNumber: nextNumber,
      },
    },
  });

  if (existingNext) {
    return {
      ok: true,
      type: "NEXT_ALREADY_EXISTS",
      installment: existingNext,
      message: "A próxima parcela já existia.",
    };
  }

  const nextDueDate = addMonthsFromPreviousDueDate(installment.dueDate, 1);
  const paymentValidityDays = recurring.paymentValidityDays || 3;
  const nextExpiresAt = calculateExpiresAt(nextDueDate, paymentValidityDays);

  const nextAmount = calculateInstallmentAmount({
    totalAmount: recurring.baseAmount,
    installments: recurring.installments,
    installmentNumber: nextNumber,
    hasInterest: recurring.hasInterest,
    interestPercent: recurring.interestPercent,
    interestStartsAtInstallment: recurring.interestStartsAtInstallment,
  });

  const nextInstallment = await prisma.recurringChargeInstallment.create({
    data: {
      recurringChargeId: recurring.id,
      installmentNumber: nextNumber,
      amount: nextAmount,
      dueDate: nextDueDate,
      expiresAt: nextExpiresAt,
      lateFeeType: recurring.lateFeeType,
      lateFeeValue: recurring.lateFeeValue,
      lateFeeApplied: false,
      status: "PENDING",
    },
  });

  const credentials = await getGatewayCredentials(recurring.firmId);

  const preference = await createMercadoPagoPreference(credentials, {
    title: `Parcela ${nextNumber}/${recurring.installments} - ${recurring.client.name}`,
    amount: nextAmount,
    externalReference: nextInstallment.id,
    payerEmail: recurring.client.email ?? null,
    description: recurring.description,
    expiresAt: nextExpiresAt,
  });

  const paymentUrl =
    preference.paymentUrl ??
    preference.initPoint ??
    preference.sandboxInitPoint ??
    null;

  const nextCharge = await prisma.charge.create({
    data: {
      firmId: recurring.firmId,
      clientId: recurring.clientId,
      processId: null,
      createdByUserId: recurring.createdByUserId,
      provider: "MERCADO_PAGO",
      providerPreferenceId: preference.providerPreferenceId,
      externalReference: nextInstallment.id,
      amount: new Prisma.Decimal(nextAmount),
      originalAmount: new Prisma.Decimal(nextAmount),
      currentAmount: new Prisma.Decimal(nextAmount),
      dueDate: nextDueDate,
      paymentValidityDays,
      expiresAt: nextExpiresAt,
      message: `${recurring.description} - Parcela ${nextNumber}/${recurring.installments}`,
      status: "PENDING",
      paymentUrl,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      lateFeeType: recurring.lateFeeType,
      lateFeeValue: recurring.lateFeeValue,
      lateFeeApplied: false,
      emailTarget: recurring.client.email,
      phoneTarget: recurring.client.phone?.replace(/\D/g, "") || null,
    },
  });

  await Promise.all([
    prisma.recurringChargeInstallment.update({
      where: { id: nextInstallment.id },
      data: {
        mercadoPagoPaymentId: preference.providerPreferenceId,
        mercadoPagoInitPoint: paymentUrl,
        emailSentAt: paymentUrl && recurring.client.email ? new Date() : null,
      },
    }),
    prisma.recurringCharge.update({
      where: { id: recurring.id },
      data: {
        currentInstallment: nextNumber,
        nextChargeDate: addMonthsFromPreviousDueDate(nextDueDate, 1),
        currentChargeId: nextCharge.id,
        currentPaymentUrl: paymentUrl,
        currentProviderPreferenceId: preference.providerPreferenceId,
        currentAmount: nextAmount,
        currentDueDate: nextDueDate,
        currentExpiresAt: nextExpiresAt,
        currentStatus: "PENDING",
        status: "ACTIVE",
      },
    }),
  ]);

  if (paymentUrl) {
    await sendEmailsForNextRecurringCharge({
      clientEmail: recurring.client.email,
      lawyerEmail: recurring.createdByUser.email,
      clientName: recurring.client.name,
      lawyerName: recurring.createdByUser.name,
      lawyerPhone: recurring.createdByUser.phone,
      amount: nextAmount,
      dueDate: nextDueDate,
      paymentUrl,
      installmentNumber: nextNumber,
      installments: recurring.installments,
    });

    await prisma.charge.update({
      where: { id: nextCharge.id },
      data: {
        emailSentAt: recurring.client.email ? new Date() : null,
      },
    });
  }

  return {
    ok: true,
    type: "RECURRING_ADVANCED",
    previousCharge: charge.id,
    nextCharge,
    nextInstallment,
    message: `Recorrência avançada para parcela ${nextNumber}/${recurring.installments}.`,
  };
}