import { prisma } from "@/lib/prisma";
import { decryptText, encryptText } from "@/lib/crypto";
import {
  createMercadoPagoPreference,
  getMercadoPagoPaymentById,
  parseMercadoPagoWebhook,
  validateMercadoPagoCredentials,
} from "@/services/mercado-pago.service";
import { sendChargeEmail } from "@/services/charge-email.service";
import { Prisma } from "@prisma/client";

const PAYMENT_PROVIDER = "MERCADO_PAGO";
const CHARGE_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits || null;
}

function chargeTitle(clientName: string) {
  return `Cobrança Jurídica - ${clientName}`;
}

function chargeMessageOrDefault(message?: string | null) {
  const value = message?.trim();
  return value || "Cobrança gerada pela plataforma.";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

async function getActiveGatewayCredentials(firmId: string) {
  const config = await prisma.paymentGatewayConfig.findUnique({
    where: { firmId },
  });

  if (!config || !config.isActive || !config.enabledBySuperadmin) {
    throw new Error("Cobrança ainda indisponível - Contate o suporte para saber mais");
  }

  return {
    accessToken: decryptText(config.accessTokenEnc),
    publicKey: config.publicKeyEnc ? decryptText(config.publicKeyEnc) : null,
  };
}

export async function saveGatewayConfigForFirmBySuperadmin(params: {
  firmId: string;
  accessToken: string;
  publicKey?: string | null;
  isActive?: boolean;
}) {
  const validation = await validateMercadoPagoCredentials({
    accessToken: params.accessToken,
    publicKey: params.publicKey,
  });

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const payload = {
    provider: PAYMENT_PROVIDER,
    accessTokenEnc: encryptText(params.accessToken),
    publicKeyEnc: params.publicKey ? encryptText(params.publicKey) : null,
    isActive: params.isActive ?? true,
    enabledBySuperadmin: true,
  };

  const existing = await prisma.paymentGatewayConfig.findUnique({
    where: { firmId: params.firmId },
  });

  if (existing) {
    return prisma.paymentGatewayConfig.update({
      where: { firmId: params.firmId },
      data: payload,
    });
  }

  return prisma.paymentGatewayConfig.create({
    data: {
      firmId: params.firmId,
      ...payload,
    },
  });
}

export async function getGatewayConfigForFirmBySuperadmin(params: {
  firmId: string;
}) {
  const config = await prisma.paymentGatewayConfig.findUnique({
    where: { firmId: params.firmId },
  });

  if (!config) return null;

  return {
    id: config.id,
    firmId: config.firmId,
    provider: config.provider,
    isActive: config.isActive,
    enabledBySuperadmin: config.enabledBySuperadmin,
    hasAccessToken: Boolean(config.accessTokenEnc),
    hasPublicKey: Boolean(config.publicKeyEnc),
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

export async function updateGatewayStatusForFirmBySuperadmin(params: {
  firmId: string;
  isActive: boolean;
}) {
  const existing = await prisma.paymentGatewayConfig.findUnique({
    where: { firmId: params.firmId },
  });

  if (!existing) {
    throw new Error("Sem acesso - contate o suporte");
  }

  return prisma.paymentGatewayConfig.update({
    where: { firmId: params.firmId },
    data: {
      isActive: params.isActive,
      enabledBySuperadmin: params.isActive ? true : existing.enabledBySuperadmin,
    },
  });
}

export async function createChargeForFirm(params: {
  actorUserId: string;
  firmId: string;
  clientId: string;
  processId?: string | null;
  amount: number;
  dueDate?: Date | string | null;
  message?: string | null;
}) {
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error("Valor da cobrança inválido.");
  }

  const [client, actor] = await Promise.all([
    prisma.client.findFirst({
      where: {
        id: params.clientId,
        firmId: params.firmId,
      },
    }),
    prisma.user.findFirst({
      where: {
        id: params.actorUserId,
        firmId: params.firmId,
        active: true,
      },
    }),
  ]);

  if (!client) {
    throw new Error("Cliente não encontrado para esta advocacia.");
  }

  if (!actor) {
    throw new Error("Usuário inválido para criar a cobrança.");
  }

  if (params.processId) {
    const process = await prisma.legalProcess.findFirst({
      where: {
        id: params.processId,
        firmId: params.firmId,
      },
      select: { id: true },
    });

    if (!process) {
      throw new Error("Processo inválido para esta advocacia.");
    }
  }

  const credentials = await getActiveGatewayCredentials(params.firmId);
  const externalReference = `charge_${params.firmId}_${params.clientId}_${Date.now()}`;

  const preference = await createMercadoPagoPreference(credentials, {
    title: chargeTitle(client.name),
    amount: params.amount,
    externalReference,
    payerEmail: client.email ?? null,
    description: chargeMessageOrDefault(params.message),
  });

  if (!preference.paymentUrl) {
    throw new Error("O Mercado Pago não retornou uma URL de pagamento.");
  }

  const created = await prisma.charge.create({
    data: {
      firmId: params.firmId,
      clientId: client.id,
      processId: params.processId ?? null,
      createdByUserId: actor.id,
      provider: PAYMENT_PROVIDER,
      providerPreferenceId: preference.providerPreferenceId,
      externalReference,
      amount: new Prisma.Decimal(params.amount),
      dueDate: params.dueDate ? new Date(params.dueDate) : null,
      message: params.message ?? null,
      status: CHARGE_STATUS.PENDING,
      paymentUrl: preference.paymentUrl,
      initPoint: preference.initPoint,
      sandboxInitPoint: preference.sandboxInitPoint,
      emailTarget: client.email ?? null,
      phoneTarget: normalizePhone(
        (client as { phone?: string | null }).phone ?? null,
      ),
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
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
          email: true,
          phone: true,
        },
      },
    },
  });

  if (created.emailTarget && created.paymentUrl) {
    try {
      await sendChargeEmail({
        to: created.emailTarget,
        clientName: created.client?.name ?? null,
        amount: formatCurrency(params.amount),
        dueDate: created.dueDate ?? null,
        lawyerName: created.createdByUser?.name ?? null,
        lawyerEmail: created.createdByUser?.email ?? null,
        lawyerPhone: created.createdByUser?.phone ?? null,
        paymentUrl: created.paymentUrl,
      });

      await prisma.charge.update({
        where: { id: created.id },
        data: {
          emailSentAt: new Date(),
        },
      });
    } catch (error) {
      console.error("sendChargeEmail error:", error);
    }
  }

  return created;
}

export async function listChargesForFirm(params: { firmId: string }) {
  return prisma.charge.findMany({
    where: {
      firmId: params.firmId,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
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
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getChargeByIdForFirm(params: {
  firmId: string;
  chargeId: string;
}) {
  return prisma.charge.findFirst({
    where: {
      id: params.chargeId,
      firmId: params.firmId,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
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
          email: true,
          phone: true,
        },
      },
    },
  });
}

export async function cancelChargeForFirm(params: {
  firmId: string;
  chargeId: string;
}) {
  const charge = await prisma.charge.findFirst({
    where: {
      id: params.chargeId,
      firmId: params.firmId,
    },
  });

  if (!charge) {
    throw new Error("Cobrança não encontrada.");
  }

  if (charge.status === CHARGE_STATUS.PAID) {
    throw new Error("Não foi possível cancelar uma cobrança que foi paga.");
  }

  if (charge.status === CHARGE_STATUS.CANCELLED) {
    return charge;
  }

  return prisma.charge.update({
    where: { id: charge.id },
    data: {
      status: CHARGE_STATUS.CANCELLED,
      lastWebhookAt: new Date(),
    },
  });
}

export async function processMercadoPagoWebhook(body: unknown) {
  const parsed = parseMercadoPagoWebhook(body);

  if (!parsed.dataId || parsed.type !== "payment") {
    return {
      ok: true,
      ignored: true,
      parsed,
    };
  }

  const configs = await prisma.paymentGatewayConfig.findMany({
    where: {
      provider: PAYMENT_PROVIDER,
      isActive: true,
      enabledBySuperadmin: true,
    },
  });

  for (const config of configs) {
    try {
      const credentials = {
        accessToken: decryptText(config.accessTokenEnc),
        publicKey: config.publicKeyEnc ? decryptText(config.publicKeyEnc) : null,
      };

      const payment = await getMercadoPagoPaymentById(credentials, parsed.dataId);

      const externalReference =
        typeof payment?.external_reference === "string"
          ? payment.external_reference
          : null;

      if (!externalReference) {
        continue;
      }

      const charge = await prisma.charge.findFirst({
        where: {
          externalReference,
          firmId: config.firmId,
        },
      });

      if (!charge) {
        continue;
      }

      const paymentStatus =
        typeof payment?.status === "string" ? payment.status : null;

      if (paymentStatus === "approved") {
        const paidAt = new Date();

        await prisma.charge.update({
          where: { id: charge.id },
          data: {
            status: CHARGE_STATUS.PAID,
            providerPaymentId: String(payment.id),
            paidAt,
            lastWebhookAt: paidAt,
          },
        });

        const recurringInstallment =
          await prisma.recurringChargeInstallment.findUnique({
            where: {
              id: charge.externalReference,
            },
          });

        if (recurringInstallment) {
          await prisma.recurringChargeInstallment.update({
            where: { id: recurringInstallment.id },
            data: {
              status: "PAID",
              paidAt,
            },
          });
        }
      } else {
        await prisma.charge.update({
          where: { id: charge.id },
          data: {
            providerPaymentId: payment?.id ? String(payment.id) : charge.providerPaymentId,
            lastWebhookAt: new Date(),
          },
        });
      }

      return {
        ok: true,
        ignored: false,
        chargeId: charge.id,
        parsed,
      };
    } catch (error) {
      console.error("processMercadoPagoWebhook config error:", error);
    }
  }

  return {
    ok: true,
    ignored: true,
    parsed,
  };
}

export const BillingConstants = {
  PAYMENT_PROVIDER,
  CHARGE_STATUS,
};
