import { prisma } from "@/lib/prisma";
import { decryptText } from "@/lib/crypto";
import { createMercadoPagoPreference } from "@/services/mercado-pago.service";
import { sendChargeEmail } from "@/services/charge-email.service";
import { Prisma } from "@prisma/client";

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function calculateInstallmentAmount(
  baseAmount: number,
  installmentNumber: number,
  hasInterest: boolean,
  interestPercent?: number | null,
  interestStartsAtInstallment?: number | null,
) {
  if (!hasInterest) return baseAmount;

  if (!interestPercent || !interestStartsAtInstallment) return baseAmount;

  if (installmentNumber < interestStartsAtInstallment) return baseAmount;

  return Number((baseAmount * (1 + interestPercent / 100)).toFixed(2));
}

function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits || null;
}

export async function processDueRecurringChargesForFirm(firmId: string) {
  const now = new Date();

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

  const credentials = {
    accessToken: decryptText(gatewayConfig.accessTokenEnc),
    publicKey: gatewayConfig.publicKeyEnc
      ? decryptText(gatewayConfig.publicKeyEnc)
      : null,
  };

  const recurringCharges = await prisma.recurringCharge.findMany({
    where: {
      firmId,
      status: "ACTIVE",
      nextChargeDate: {
        lte: now,
      },
    },
    include: {
      installmentsGenerated: {
        orderBy: {
          installmentNumber: "desc",
        },
      },
      client: true,
    },
    orderBy: {
      nextChargeDate: "asc",
    },
  });

  let createdCount = 0;
  let completedCount = 0;

  const generatedInstallments: Array<{
    recurringChargeId: string;
    installmentNumber: number;
    amount: number;
    paymentUrl: string | null;
    chargeId: string | null;
  }> = [];

  for (const recurring of recurringCharges) {
    const nextInstallmentNumber = recurring.currentInstallment + 1;

    if (nextInstallmentNumber > recurring.installments) {
      await prisma.recurringCharge.update({
        where: { id: recurring.id },
        data: {
          status: "COMPLETED",
        },
      });

      completedCount++;
      continue;
    }

    const alreadyExists = recurring.installmentsGenerated.some(
      (item) => item.installmentNumber === nextInstallmentNumber,
    );

    if (alreadyExists) {
      continue;
    }

    const amount = calculateInstallmentAmount(
      recurring.baseAmount,
      nextInstallmentNumber,
      recurring.hasInterest,
      recurring.interestPercent,
      recurring.interestStartsAtInstallment,
    );

    const dueDate = recurring.nextChargeDate;

    const createdInstallment = await prisma.recurringChargeInstallment.create({
      data: {
        recurringChargeId: recurring.id,
        installmentNumber: nextInstallmentNumber,
        amount,
        dueDate,
        status: "PENDING",
      },
    });

    const preference = await createMercadoPagoPreference(credentials, {
      title: `Parcela ${nextInstallmentNumber}/${recurring.installments} - ${recurring.client.name}`,
      amount,
      externalReference: createdInstallment.id,
      payerEmail: recurring.client.email ?? null,
      description: recurring.description,
    });

    const paymentUrl =
      preference.paymentUrl ?? preference.initPoint ?? preference.sandboxInitPoint ?? null;

    await prisma.recurringChargeInstallment.update({
      where: { id: createdInstallment.id },
      data: {
        mercadoPagoPaymentId: preference.providerPreferenceId,
        mercadoPagoInitPoint: paymentUrl,
      },
    });

    const createdCharge = await prisma.charge.create({
      data: {
        firmId: recurring.firmId,
        clientId: recurring.clientId,
        processId: null,
        createdByUserId: recurring.createdByUserId,
        provider: "MERCADO_PAGO",
        providerPreferenceId: preference.providerPreferenceId,
        externalReference: createdInstallment.id,
        amount: new Prisma.Decimal(amount),
        message: `${recurring.description} - Parcela ${nextInstallmentNumber}/${recurring.installments}`,
        status: "PENDING",
        paymentUrl,
        initPoint: preference.initPoint,
        sandboxInitPoint: preference.sandboxInitPoint,
        emailTarget: recurring.client.email ?? null,
        phoneTarget: normalizePhone(recurring.client.phone ?? null),
      },
    });

    if (recurring.client.email && paymentUrl) {
      try {
        await sendChargeEmail({
          to: recurring.client.email,
          clientName: recurring.client.name ?? null,
          amount: formatCurrency(amount),
          message: `${recurring.description} - Parcela ${nextInstallmentNumber}/${recurring.installments}`,
          paymentUrl,
        });

        await Promise.all([
          prisma.recurringChargeInstallment.update({
            where: { id: createdInstallment.id },
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
        console.error("sendChargeEmail recurring installment error:", error);
      }
    }

    const isLast = nextInstallmentNumber >= recurring.installments;

    await prisma.recurringCharge.update({
      where: { id: recurring.id },
      data: {
        currentInstallment: nextInstallmentNumber,
        nextChargeDate: addMonths(recurring.nextChargeDate, 1),
        status: isLast ? "COMPLETED" : "ACTIVE",
      },
    });

    generatedInstallments.push({
      recurringChargeId: recurring.id,
      installmentNumber: nextInstallmentNumber,
      amount,
      paymentUrl,
      chargeId: createdCharge.id,
    });

    createdCount++;
  }

  return {
    ok: true,
    data: {
      totalRecurringEvaluated: recurringCharges.length,
      installmentsCreated: createdCount,
      recurringCompleted: completedCount,
      generatedInstallments,
    },
  };
}
export async function processAllDueRecurringCharges() {
  const dueRecurring = await prisma.recurringCharge.findMany({
    where: {
      status: "ACTIVE",
      nextChargeDate: {
        lte: new Date(),
      },
    },
    select: {
      firmId: true,
    },
    distinct: ["firmId"],
  });

  const results: Array<{
    firmId: string;
    ok: boolean;
    message?: string;
    data?: unknown;
  }> = [];

  for (const item of dueRecurring) {
    try {
      const result = await processDueRecurringChargesForFirm(item.firmId);
      results.push({
        firmId: item.firmId,
        ok: true,
        data: result.data,
      });
    } catch (error) {
      results.push({
        firmId: item.firmId,
        ok: false,
        message: error instanceof Error ? error.message : "Erro ao processar firma.",
      });
    }
  }

  return {
    ok: true,
    data: {
      firmsProcessed: results.length,
      results,
    },
  };
}