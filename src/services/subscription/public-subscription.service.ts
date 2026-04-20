import { prisma } from "@/lib/prisma";
import { decryptText } from "@/lib/crypto";
import {
  createMercadoPagoPreference,
  getMercadoPagoPaymentById,
  parseMercadoPagoWebhook,
} from "@/services/mercado-pago.service";
function parsePlanAmount(priceLabel: string) {
  const normalized = (priceLabel || "")
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Preço do plano inválido para checkout.");
  }

  return amount;
}

export async function createPublicPlanCheckout(params: {
  userId: string;
  planId: string;
}) {
  const [user, plan, paymentConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        role: true,
        firmId: true,
      },
    }),
    prisma.publicPlan.findUnique({
      where: { id: params.planId },
    }),
    prisma.publicSitePaymentConfig.findUnique({
      where: { id: "global-public-payment" },
    }),
  ]);

  if (!user || !user.active) {
    throw new Error("Usuário inválido para checkout.");
  }

  if (!plan || !plan.isActive) {
    throw new Error("Plano não encontrado ou inativo.");
  }

  if (!plan.isPurchasable) {
    throw new Error("Este plano ainda não está disponível para compra.");
  }

  if (!paymentConfig || !paymentConfig.isActive || !paymentConfig.accessTokenEnc) {
    throw new Error("Pagamento do site público ainda não está configurado.");
  }

  const activeSubscription = await prisma.saaSSubscription.findFirst({
    where: {
      userId: user.id,
      publicPlanId: plan.id,
      status: {
        in: ["PENDING", "PAID"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (activeSubscription?.status === "PAID") {
    return {
      alreadyPaid: true,
      subscription: activeSubscription,
      checkoutUrl: activeSubscription.checkoutUrl,
    };
  }

  if (activeSubscription?.status === "PENDING" && activeSubscription.checkoutUrl) {
    return {
      alreadyPending: true,
      subscription: activeSubscription,
      checkoutUrl: activeSubscription.checkoutUrl,
    };
  }

  const amount = parsePlanAmount(plan.priceLabel);
  const accessToken = decryptText(paymentConfig.accessTokenEnc);
  const externalReference = `site_plan_${user.id}_${plan.id}_${Date.now()}`;

  const preference = await createMercadoPagoPreference(
    {
      accessToken,
      publicKey: paymentConfig.publicKeyEnc
        ? decryptText(paymentConfig.publicKeyEnc)
        : null,
    },
    {
      title: `Plano ${plan.name} - JuridicVas`,
      amount,
      externalReference,
      payerEmail: user.email ?? null,
      description: plan.description || `Assinatura do plano ${plan.name}`,
    }
  );

  const checkoutUrl =
    preference.paymentUrl ?? preference.initPoint ?? preference.sandboxInitPoint ?? null;

  if (!checkoutUrl) {
    throw new Error("O Mercado Pago não retornou uma URL de checkout.");
  }

  const subscription = await prisma.saaSSubscription.create({
    data: {
      userId: user.id,
      publicPlanId: plan.id,
      status: "PENDING",
      provider: "MERCADO_PAGO",
      providerPreferenceId: preference.providerPreferenceId,
      externalReference,
      checkoutUrl,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      onboardingStatus: "PLAN_PENDING_PAYMENT",
      selectedPlanId: plan.id,
      selectedPlanNameSnapshot: plan.name,
    },
  });

  return {
    alreadyPaid: false,
    alreadyPending: false,
    subscription,
    checkoutUrl,
  };
}

export async function processPublicSubscriptionWebhook(body: unknown) {
  const parsed = parseMercadoPagoWebhook(body);

  if (!parsed.dataId || parsed.type !== "payment") {
    return {
      ok: true,
      ignored: true,
      parsed,
    };
  }

  const paymentConfig = await prisma.publicSitePaymentConfig.findUnique({
    where: { id: "global-public-payment" },
  });

  if (!paymentConfig || !paymentConfig.isActive || !paymentConfig.accessTokenEnc) {
    return {
      ok: true,
      ignored: true,
      reason: "PUBLIC_SITE_PAYMENT_NOT_CONFIGURED",
      parsed,
    };
  }

  const credentials = {
    accessToken: decryptText(paymentConfig.accessTokenEnc),
    publicKey: paymentConfig.publicKeyEnc
      ? decryptText(paymentConfig.publicKeyEnc)
      : null,
  };

  const payment = await getMercadoPagoPaymentById(credentials, parsed.dataId);

  const externalReference =
    typeof payment?.external_reference === "string"
      ? payment.external_reference
      : null;

  if (!externalReference) {
    return {
      ok: true,
      ignored: true,
      reason: "MISSING_EXTERNAL_REFERENCE",
      parsed,
    };
  }

  const subscription = await prisma.saaSSubscription.findUnique({
    where: { externalReference },
  });

  if (!subscription) {
    return {
      ok: true,
      ignored: true,
      reason: "SUBSCRIPTION_NOT_FOUND",
      parsed,
    };
  }

  const paymentStatus =
    typeof payment?.status === "string" ? payment.status : null;

  if (paymentStatus === "approved") {
    const paidAt = new Date();

    await prisma.saaSSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "PAID",
        providerPaymentId: payment?.id ? String(payment.id) : null,
        paidAt,
      },
    });

    await prisma.user.update({
      where: { id: subscription.userId },
      data: {
        onboardingStatus: "FIRM_REQUIRED",
      },
    });

    return {
      ok: true,
      ignored: false,
      subscriptionId: subscription.id,
      status: "PAID",
      parsed,
    };
  }

  if (paymentStatus === "cancelled" || paymentStatus === "rejected") {
    await prisma.saaSSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "CANCELLED",
        providerPaymentId: payment?.id ? String(payment.id) : subscription.providerPaymentId,
      },
    });

    await prisma.user.update({
      where: { id: subscription.userId },
      data: {
        onboardingStatus: "PLAN_REQUIRED",
      },
    });

    return {
      ok: true,
      ignored: false,
      subscriptionId: subscription.id,
      status: "CANCELLED",
      parsed,
    };
  }

  return {
    ok: true,
    ignored: false,
    subscriptionId: subscription.id,
    status: paymentStatus ?? "UNKNOWN",
    parsed,
  };
}

export async function getPublicSubscriptionStatusForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      firmId: true,
      onboardingStatus: true,
      selectedPlanId: true,
      selectedPlanNameSnapshot: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    throw new Error("Usuário inválido.");
  }

  const subscription = await prisma.saaSSubscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      publicPlan: {
        select: {
          id: true,
          name: true,
          priceLabel: true,
          billingPeriod: true,
        },
      },
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firmId: user.firmId,
      onboardingStatus: user.onboardingStatus,
    },
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          checkoutUrl: subscription.checkoutUrl,
          paidAt: subscription.paidAt,
          plan: subscription.publicPlan,
        }
      : null,
    nextStep:
      user.onboardingStatus === "FIRM_REQUIRED"
        ? "CREATE_FIRM"
        : user.onboardingStatus === "PLAN_PENDING_PAYMENT"
        ? "WAIT_PAYMENT"
        : user.onboardingStatus === "ACTIVE"
        ? "GO_ADMIN"
        : "BUY_PLAN",
  };
}
function slugifyFirmName(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .trim();
}

async function buildUniqueFirmSlug(baseName: string) {
  const base = slugifyFirmName(baseName) || "advocacia";
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.lawFirm.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) return slug;

    counter += 1;
    slug = `${base}-${counter}`;
  }
}

export async function createFirmForPaidUser(params: {
  userId: string;
  firmName: string;
}) {
  const firmName = (params.firmName || "").trim();

  if (!firmName) {
    throw new Error("Nome da advocacia é obrigatório.");
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      firmId: true,
      active: true,
      onboardingStatus: true,
      selectedPlanId: true,
      selectedPlanNameSnapshot: true,
    },
  });

  if (!user || !user.active) {
    throw new Error("Usuário inválido.");
  }

  if (user.role === "SUPERADMIN") {
    throw new Error("SUPERADMIN não pode criar advocacia por este fluxo.");
  }

  if (user.firmId) {
    throw new Error("Usuário já possui advocacia vinculada.");
  }

  if (user.onboardingStatus !== "FIRM_REQUIRED") {
    throw new Error("O usuário ainda não está liberado para criar a advocacia.");
  }

  const paidSubscription = await prisma.saaSSubscription.findFirst({
    where: {
      userId: user.id,
      status: "PAID",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      publicPlan: true,
    },
  });

  if (!paidSubscription) {
    throw new Error("Nenhum plano pago encontrado para este usuário.");
  }

  const slug = await buildUniqueFirmSlug(firmName);

  const result = await prisma.$transaction(async (tx) => {
    const firm = await tx.lawFirm.create({
      data: {
        name: firmName,
        slug,
        active: true,
      },
    });

    await tx.firmConfig.create({
      data: {
        firmId: firm.id,
        maxClients: 50,
        moduleDashboard: paidSubscription.publicPlan.moduleDashboard,
        moduleClients: paidSubscription.publicPlan.moduleClients,
        moduleProcesses: paidSubscription.publicPlan.moduleProcesses,
        moduleDeadlines: paidSubscription.publicPlan.moduleDeadlines,
        moduleAppointments: paidSubscription.publicPlan.moduleAppointments,
        moduleAvailability: paidSubscription.publicPlan.moduleAvailability,
        moduleUsers: paidSubscription.publicPlan.moduleUsers,
        moduleCharges: paidSubscription.publicPlan.moduleCharges,
      },
    });

    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        firmId: firm.id,
        role: "MASTER",
        onboardingStatus: "ACTIVE",
      selectedPlanId: user.selectedPlanId ?? paidSubscription.publicPlanId,
      selectedPlanNameSnapshot: user.selectedPlanNameSnapshot ?? paidSubscription.publicPlan.name,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        firmId: true,
        onboardingStatus: true,
      selectedPlanId: true,
      selectedPlanNameSnapshot: true,
      },
    });

    return {
      firm,
      user: updatedUser,
    };
  });

  return result;
}