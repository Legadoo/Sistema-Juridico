const fs = require("fs");

const file = "src/services/charge.service.ts";

function read() {
  return fs.readFileSync(file, "utf8");
}

function write(content) {
  fs.writeFileSync(file, content, "utf8");
}

let content = read();

const helperMarker = "async function markRecurringInstallmentAsPaidFromCharge";

const helperCode = `
async function markRecurringInstallmentAsPaidFromCharge(params: {
  chargeId: string;
  providerPaymentId: string;
  paidAt: Date;
}) {
  const paidCharge = await prisma.charge.findUnique({
    where: { id: params.chargeId },
  });

  if (!paidCharge) {
    return {
      recurringInstallmentPaid: false,
      reason: "PAID_CHARGE_NOT_FOUND",
    };
  }

  let installmentExternalReference = paidCharge.externalReference;

  if (paidCharge.previousChargeId) {
    const previousCharge = await prisma.charge.findUnique({
      where: { id: paidCharge.previousChargeId },
    });

    if (previousCharge?.externalReference) {
      installmentExternalReference = previousCharge.externalReference;
    }
  }

  const installment = await prisma.recurringChargeInstallment.findFirst({
    where: {
      id: installmentExternalReference,
    },
  });

  if (!installment) {
    return {
      recurringInstallmentPaid: false,
      reason: "RECURRING_INSTALLMENT_NOT_FOUND",
    };
  }

  await prisma.recurringChargeInstallment.update({
    where: { id: installment.id },
    data: {
      status: "PAID",
      paidAt: params.paidAt,
      mercadoPagoPaymentId: params.providerPaymentId,
    },
  });

  return {
    recurringInstallmentPaid: true,
    recurringInstallmentId: installment.id,
  };
}
`;

if (!content.includes(helperMarker)) {
  const insertBefore = "export async function processMercadoPagoWebhook";

  if (!content.includes(insertBefore)) {
    console.error("ERRO: nao encontrei processMercadoPagoWebhook.");
    process.exit(1);
  }

  content = content.replace(insertBefore, helperCode + "\n" + insertBefore);
  console.log("PATCH: helper markRecurringInstallmentAsPaidFromCharge adicionado.");
} else {
  console.log("OK: helper ja existe.");
}

const functionRegex = /export async function processMercadoPagoWebhook\([\s\S]*?\n\}/;

const match = content.match(functionRegex);

if (!match) {
  console.error("ERRO: nao consegui localizar a funcao processMercadoPagoWebhook inteira.");
  process.exit(1);
}

const oldFunction = match[0];

if (oldFunction.includes("markRecurringInstallmentAsPaidFromCharge")) {
  console.log("OK: processMercadoPagoWebhook ja chama helper da Fase 5.");
} else {
  const newFunction = `export async function processMercadoPagoWebhook(body: unknown) {
  const parsed = parseMercadoPagoWebhook(body);

  if (!parsed.dataId) {
    return {
      ignored: true,
      reason: "NO_PAYMENT_ID",
    };
  }

  const firmsWithGateway = await prisma.paymentGatewayConfig.findMany({
    where: {
      isActive: true,
      enabledBySuperadmin: true,
      accessTokenEnc: {
        not: null,
      },
    },
    select: {
      firmId: true,
      accessTokenEnc: true,
      publicKeyEnc: true,
    },
  });

  for (const gateway of firmsWithGateway) {
    if (!gateway.accessTokenEnc) continue;

    try {
      const credentials = {
        accessToken: decryptText(gateway.accessTokenEnc),
        publicKey: gateway.publicKeyEnc ? decryptText(gateway.publicKeyEnc) : null,
      };

      const payment = await getMercadoPagoPaymentById(credentials, parsed.dataId);

      const status = String(payment?.status ?? "");
      const externalReference = String(payment?.external_reference ?? "");
      const providerPaymentId = String(payment?.id ?? parsed.dataId);

      if (!externalReference) {
        continue;
      }

      const charge = await prisma.charge.findFirst({
        where: {
          firmId: gateway.firmId,
          externalReference,
        },
      });

      if (!charge) {
        continue;
      }

      if (status !== "approved") {
        await prisma.charge.update({
          where: { id: charge.id },
          data: {
            lastWebhookAt: new Date(),
            providerPaymentId,
          },
        });

        return {
          ignored: true,
          reason: "PAYMENT_NOT_APPROVED",
          status,
          chargeId: charge.id,
        };
      }

      const paidAt = payment?.date_approved
        ? new Date(payment.date_approved)
        : new Date();

      const updatedCharge = await prisma.charge.update({
        where: { id: charge.id },
        data: {
          status: "PAID",
          providerPaymentId,
          paidAt,
          lastWebhookAt: new Date(),
        },
      });

      const installmentResult = await markRecurringInstallmentAsPaidFromCharge({
        chargeId: updatedCharge.id,
        providerPaymentId,
        paidAt,
      });

      return {
        ignored: false,
        chargeId: updatedCharge.id,
        status: "PAID",
        providerPaymentId,
        recurringInstallmentPaid: installmentResult.recurringInstallmentPaid,
        recurringInstallmentId: installmentResult.recurringInstallmentId ?? null,
        recurringInstallmentReason: installmentResult.reason ?? null,
      };
    } catch (error) {
      console.error("processMercadoPagoWebhook firm attempt error:", {
        firmId: gateway.firmId,
        error,
      });
    }
  }

  return {
    ignored: true,
    reason: "CHARGE_NOT_FOUND_FOR_PAYMENT",
  };
}`;

  content = content.replace(oldFunction, newFunction);
  console.log("PATCH: processMercadoPagoWebhook reescrita para reconhecer novo link.");
}

write(content);
console.log("");
console.log("Fase 5 patch aplicado.");
