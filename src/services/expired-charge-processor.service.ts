import { prisma } from "@/lib/prisma";
import { decryptText } from "@/lib/crypto";
import { createMercadoPagoPreference } from "@/services/mercado-pago.service";
import { sendChargeEmail } from "@/services/charge-email.service";
import { Prisma } from "@prisma/client";

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

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value == null) return 0;
  return Number(value.toString());
}

function normalizePaymentValidityDays(value?: number | null) {
  const numeric = Number(value ?? 3);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 3;
  }

  return Math.max(1, Math.floor(numeric));
}

function calculateExpiresAt(baseDate: Date, paymentValidityDays: number) {
  const expiresAt = new Date(baseDate);
  expiresAt.setDate(expiresAt.getDate() + paymentValidityDays);
  expiresAt.setHours(23, 59, 59, 999);
  return expiresAt;
}

function calculateLateFee(input: {
  currentAmount: number;
  lateFeeType?: string | null;
  lateFeeValue?: number | null;
}) {
  const currentAmount = Number(input.currentAmount || 0);
  const feeValue = Number(input.lateFeeValue || 0);

  if (!Number.isFinite(currentAmount) || currentAmount <= 0) {
    return {
      increaseAmount: 0,
      finalAmount: 0,
    };
  }

  if (input.lateFeeType === "PERCENT" && Number.isFinite(feeValue) && feeValue > 0) {
    const increaseAmount = Number((currentAmount * (feeValue / 100)).toFixed(2));
    return {
      increaseAmount,
      finalAmount: Number((currentAmount + increaseAmount).toFixed(2)),
    };
  }

  if (input.lateFeeType === "FIXED" && Number.isFinite(feeValue) && feeValue > 0) {
    const increaseAmount = Number(feeValue.toFixed(2));
    return {
      increaseAmount,
      finalAmount: Number((currentAmount + increaseAmount).toFixed(2)),
    };
  }

  return {
    increaseAmount: 0,
    finalAmount: Number(currentAmount.toFixed(2)),
  };
}

async function getCredentialsForFirm(firmId: string) {
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

export async function processExpiredChargesForFirm(firmId: string) {
  const now = new Date();

  const credentials = await getCredentialsForFirm(firmId);

  const expiredPendingCharges = await prisma.charge.findMany({
    where: {
      firmId,
      status: "PENDING",
      expiresAt: {
        not: null,
        lt: now,
      },
      replacedByChargeId: null,
    },
    include: {
      client: true,
      createdByUser: true,
    },
    orderBy: {
      expiresAt: "asc",
    },
  });

  let expiredCount = 0;
  let regeneratedCount = 0;
  let emailSentCount = 0;

  const generatedCharges: Array<{
    oldChargeId: string;
    newChargeId: string;
    oldAmount: number;
    newAmount: number;
    increaseAmount: number;
    paymentUrl: string | null;
  }> = [];

  for (const oldCharge of expiredPendingCharges) {
    const currentAmount =
      decimalToNumber(oldCharge.currentAmount) ||
      decimalToNumber(oldCharge.amount);

    const { increaseAmount, finalAmount } = calculateLateFee({
      currentAmount,
      lateFeeType: oldCharge.lateFeeType,
      lateFeeValue: oldCharge.lateFeeValue,
    });

    const paymentValidityDays = normalizePaymentValidityDays(
      oldCharge.paymentValidityDays,
    );

    const newDueDate = new Date();
    const newExpiresAt = calculateExpiresAt(newDueDate, paymentValidityDays);

    const newExternalReference = `late_${oldCharge.id}_${Date.now()}`;

    const preference = await createMercadoPagoPreference(credentials, {
      title: `Cobrança atualizada - ${oldCharge.client.name}`,
      amount: finalAmount,
      externalReference: newExternalReference,
      payerEmail: oldCharge.client.email ?? null,
      description:
        oldCharge.message ??
        `Cobrança atualizada após vencimento.`,
      expiresAt: newExpiresAt,
    });

    const paymentUrl =
      preference.paymentUrl ?? preference.initPoint ?? preference.sandboxInitPoint ?? null;

    const newCharge = await prisma.charge.create({
      data: {
        firmId: oldCharge.firmId,
        clientId: oldCharge.clientId,
        processId: oldCharge.processId,
        createdByUserId: oldCharge.createdByUserId,
        provider: oldCharge.provider,
        providerPreferenceId: preference.providerPreferenceId,
        externalReference: newExternalReference,
        amount: new Prisma.Decimal(finalAmount),
        originalAmount:
          oldCharge.originalAmount ?? new Prisma.Decimal(currentAmount),
        currentAmount: new Prisma.Decimal(finalAmount),
        dueDate: newDueDate,
        paymentValidityDays,
        expiresAt: newExpiresAt,
        message:
          oldCharge.message ??
          `Cobrança atualizada após vencimento.`,
        status: "PENDING",
        paymentUrl,
        initPoint: preference.initPoint,
        sandboxInitPoint: preference.sandboxInitPoint,
        lateFeeType: oldCharge.lateFeeType ?? "NONE",
        lateFeeValue: oldCharge.lateFeeValue,
        lateFeeApplied: increaseAmount > 0,
        lateFeeAppliedAt: increaseAmount > 0 ? now : null,
        previousChargeId: oldCharge.id,
        emailTarget: oldCharge.client.email ?? null,
        phoneTarget: normalizePhone(oldCharge.client.phone ?? null),
      },
    });

    await prisma.charge.update({
      where: { id: oldCharge.id },
      data: {
        status: "EXPIRED",
        expiredAt: now,
        replacedByChargeId: newCharge.id,
      },
    });

    const relatedInstallment = await prisma.recurringChargeInstallment.findFirst({
      where: {
        id: oldCharge.externalReference,
      },
    });

    if (relatedInstallment) {
      await prisma.recurringChargeInstallment.update({
        where: { id: relatedInstallment.id },
        data: {
          expiredAt: now,
          mercadoPagoPaymentId: preference.providerPreferenceId,
          mercadoPagoInitPoint: paymentUrl,
          expiresAt: newExpiresAt,
          lateFeeType: oldCharge.lateFeeType ?? "NONE",
          lateFeeValue: oldCharge.lateFeeValue,
          lateFeeAmount: increaseAmount,
          lateFeeApplied: increaseAmount > 0,
          lateFeeAppliedAt: increaseAmount > 0 ? now : null,
        },
      });
    }

    if (oldCharge.client.email && paymentUrl) {
      try {
        await sendChargeEmail({
          to: oldCharge.client.email,
          clientName: oldCharge.client.name ?? null,
          amount: formatCurrency(finalAmount),
          dueDate: newDueDate,
          lawyerName: oldCharge.createdByUser?.name ?? null,
          lawyerEmail: oldCharge.createdByUser?.email ?? null,
          lawyerPhone: oldCharge.createdByUser?.phone ?? null,
          paymentUrl,
        });

        await prisma.charge.update({
          where: { id: newCharge.id },
          data: {
            emailSentAt: new Date(),
          },
        });

        emailSentCount++;
      } catch (error) {
        console.error("sendChargeEmail expired charge error:", error);
      }
    }

    generatedCharges.push({
      oldChargeId: oldCharge.id,
      newChargeId: newCharge.id,
      oldAmount: currentAmount,
      newAmount: finalAmount,
      increaseAmount,
      paymentUrl,
    });

    expiredCount++;
    regeneratedCount++;
  }

  return {
    ok: true,
    data: {
      expiredEvaluated: expiredPendingCharges.length,
      expiredCount,
      regeneratedCount,
      emailSentCount,
      generatedCharges,
    },
  };
}

export async function processAllExpiredCharges() {
  const firmsWithExpiredCharges = await prisma.charge.findMany({
    where: {
      status: "PENDING",
      expiresAt: {
        not: null,
        lt: new Date(),
      },
      replacedByChargeId: null,
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

  for (const item of firmsWithExpiredCharges) {
    try {
      const result = await processExpiredChargesForFirm(item.firmId);

      results.push({
        firmId: item.firmId,
        ok: true,
        data: result.data,
      });
    } catch (error) {
      results.push({
        firmId: item.firmId,
        ok: false,
        message:
          error instanceof Error ? error.message : "Erro ao processar expiradas.",
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