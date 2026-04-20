import { prisma } from "@/lib/prisma";
import { encryptText, decryptText } from "@/lib/crypto";
import { validateMercadoPagoCredentials } from "@/services/mercado-pago.service";

const LANDING_CONFIG_ID = "global-public-site";

export async function ensureLandingConfig() {
  return prisma.landingPageConfig.upsert({
    where: { id: LANDING_CONFIG_ID },
    update: {},
    create: {
      id: LANDING_CONFIG_ID,
      brandName: "JURIDICVAS",
      heroTitle:
        "Gestão jurídica premium para escritórios que querem crescer com organização.",
      heroSubtitle:
        "Centralize clientes, processos, prazos, agendamentos e cobranças em uma plataforma moderna, profissional e acessível.",
      heroPrimaryButtonText: "Entrar",
      heroSecondaryButtonText: "Acompanhar",
      aboutTitle: "Sobre o sistema",
      aboutText:
        "O JURIDICVAS foi criado para profissionalizar a operação jurídica com mais controle, imagem profissional e praticidade no dia a dia.",
      featuresTitle: "Funcionalidades",
      featuresSubtitle:
        "Tudo o que seu escritório precisa para operar com segurança e organização.",
      mediaTitle: "Veja o sistema em ação",
      mediaSubtitle:
        "",
      plansTitle: "Planos",
      plansSubtitle: "Escolha o plano ideal para o seu momento.",
      updatesTitle: "Atualizações",
      updatesSubtitle:
        "Acompanhe novidades, melhorias e lançamentos do sistema.",
      ctaTitle:
        "Pronto para elevar o nível da sua operação jurídica?",
      ctaSubtitle:
        "Entre agora ou acompanhe seu processo em um ambiente moderno, seguro e profissional.",
      footerText: "JURIDICVAS - Plataforma jurídica premium.",
      loginUrl: "/login",
      trackUrl: "/acompanhar",
      isPublished: true,
    },
  });
}

function safeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized;
}

function safeOptionalText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

function safeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeDate(value: unknown, fallback = new Date()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return fallback;
}

export async function getPublicSiteData() {
  const config = await ensureLandingConfig();

  const [features, media, plans, updates] = await Promise.all([
    prisma.landingFeature.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.landingMedia.findMany({
      where: { isActive: true },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.publicPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.publicUpdatePost.findMany({
      where: { isPublished: true },
      orderBy: [{ isHighlighted: "desc" }, { publishedAt: "desc" }],
      take: 12,
    }),
  ]);

  return {
    config,
    features,
    media,
    plans,
    updates,
  };
}

export async function getAdminSiteData() {
  const config = await ensureLandingConfig();

  const [features, media, plans, updates] = await Promise.all([
    prisma.landingFeature.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.landingMedia.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.publicPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.publicUpdatePost.findMany({
      orderBy: [{ isHighlighted: "desc" }, { publishedAt: "desc" }],
    }),
  ]);

  return {
    config,
    features,
    media,
    plans,
    updates,
  };
}

type UpdateLandingConfigInput = {
  brandName?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroPrimaryButtonText?: string;
  heroSecondaryButtonText?: string;
  aboutTitle?: string;
  aboutText?: string;
  featuresTitle?: string;
  featuresSubtitle?: string;
  mediaTitle?: string;
  mediaSubtitle?: string;
  plansTitle?: string;
  plansSubtitle?: string;
  updatesTitle?: string;
  updatesSubtitle?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
  footerText?: string;
  loginUrl?: string;
  trackUrl?: string;
  isPublished?: boolean;
};

export async function updateLandingConfig(input: UpdateLandingConfigInput) {
  const current = await ensureLandingConfig();

  return prisma.landingPageConfig.update({
    where: { id: LANDING_CONFIG_ID },
    data: {
      brandName: safeText(input.brandName, current.brandName) || current.brandName,
      heroTitle: safeText(input.heroTitle, current.heroTitle) || current.heroTitle,
      heroSubtitle: safeText(input.heroSubtitle, current.heroSubtitle) || current.heroSubtitle,
      heroPrimaryButtonText:
        safeText(input.heroPrimaryButtonText, current.heroPrimaryButtonText) ||
        current.heroPrimaryButtonText,
      heroSecondaryButtonText:
        safeText(input.heroSecondaryButtonText, current.heroSecondaryButtonText) ||
        current.heroSecondaryButtonText,
      aboutTitle: safeText(input.aboutTitle, current.aboutTitle) || current.aboutTitle,
      aboutText: safeText(input.aboutText, current.aboutText) || current.aboutText,
      featuresTitle:
        safeText(input.featuresTitle, current.featuresTitle) || current.featuresTitle,
      featuresSubtitle:
        safeText(input.featuresSubtitle, current.featuresSubtitle) ||
        current.featuresSubtitle,
      mediaTitle: safeText(input.mediaTitle, current.mediaTitle) || current.mediaTitle,
      mediaSubtitle:
        safeText(input.mediaSubtitle, current.mediaSubtitle) || current.mediaSubtitle,
      plansTitle: safeText(input.plansTitle, current.plansTitle) || current.plansTitle,
      plansSubtitle:
        safeText(input.plansSubtitle, current.plansSubtitle) || current.plansSubtitle,
      updatesTitle:
        safeText(input.updatesTitle, current.updatesTitle) || current.updatesTitle,
      updatesSubtitle:
        safeText(input.updatesSubtitle, current.updatesSubtitle) ||
        current.updatesSubtitle,
      ctaTitle: safeText(input.ctaTitle, current.ctaTitle) || current.ctaTitle,
      ctaSubtitle:
        safeText(input.ctaSubtitle, current.ctaSubtitle) || current.ctaSubtitle,
      footerText: safeText(input.footerText, current.footerText) || current.footerText,
      loginUrl: safeText(input.loginUrl, current.loginUrl) || current.loginUrl,
      trackUrl: safeText(input.trackUrl, current.trackUrl) || current.trackUrl,
      isPublished:
        typeof input.isPublished === "boolean"
          ? input.isPublished
          : current.isPublished,
    },
  });
}

export async function listFeatures() {
  return prisma.landingFeature.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createFeature(input: Record<string, unknown>) {
  const title = safeText(input.title);
  const description = safeText(input.description);

  if (!title) throw new Error("Título do recurso é obrigatório.");
  if (!description) throw new Error("Descrição do recurso é obrigatória.");

  return prisma.landingFeature.create({
    data: {
      title,
      description,
      icon: safeOptionalText(input.icon),
      sortOrder: safeNumber(input.sortOrder, 0),
      isActive: safeBoolean(input.isActive, true),
    },
  });
}

export async function updateFeature(id: string, input: Record<string, unknown>) {
  const current = await prisma.landingFeature.findUnique({ where: { id } });
  if (!current) throw new Error("Recurso não encontrado.");

  return prisma.landingFeature.update({
    where: { id },
    data: {
      title: safeText(input.title, current.title) || current.title,
      description: safeText(input.description, current.description) || current.description,
      icon:
        Object.prototype.hasOwnProperty.call(input, "icon")
          ? safeOptionalText(input.icon)
          : current.icon,
      sortOrder:
        Object.prototype.hasOwnProperty.call(input, "sortOrder")
          ? safeNumber(input.sortOrder, current.sortOrder)
          : current.sortOrder,
      isActive:
        Object.prototype.hasOwnProperty.call(input, "isActive")
          ? safeBoolean(input.isActive, current.isActive)
          : current.isActive,
    },
  });
}

export async function deleteFeature(id: string) {
  return prisma.landingFeature.delete({ where: { id } });
}

export async function listMedia() {
  return prisma.landingMedia.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createMedia(input: Record<string, unknown>) {
  const title = safeText(input.title);
  const url = safeText(input.url);

  if (!title) throw new Error("Título da mídia é obrigatório.");
  if (!url) throw new Error("URL da mídia é obrigatória.");

  return prisma.landingMedia.create({
    data: {
      title,
      description: safeOptionalText(input.description),
      type: safeText(input.type, "image") || "image",
      url,
      alt: safeOptionalText(input.alt),
      section: safeText(input.section, "hero") || "hero",
      sortOrder: safeNumber(input.sortOrder, 0),
      isActive: safeBoolean(input.isActive, true),
    },
  });
}

export async function updateMedia(id: string, input: Record<string, unknown>) {
  const current = await prisma.landingMedia.findUnique({ where: { id } });
  if (!current) throw new Error("Mídia não encontrada.");

  return prisma.landingMedia.update({
    where: { id },
    data: {
      title: safeText(input.title, current.title) || current.title,
      description:
        Object.prototype.hasOwnProperty.call(input, "description")
          ? safeOptionalText(input.description)
          : current.description,
      type: safeText(input.type, current.type) || current.type,
      url: safeText(input.url, current.url) || current.url,
      alt:
        Object.prototype.hasOwnProperty.call(input, "alt")
          ? safeOptionalText(input.alt)
          : current.alt,
      section: safeText(input.section, current.section) || current.section,
      sortOrder:
        Object.prototype.hasOwnProperty.call(input, "sortOrder")
          ? safeNumber(input.sortOrder, current.sortOrder)
          : current.sortOrder,
      isActive:
        Object.prototype.hasOwnProperty.call(input, "isActive")
          ? safeBoolean(input.isActive, current.isActive)
          : current.isActive,
    },
  });
}

export async function deleteMedia(id: string) {
  return prisma.landingMedia.delete({ where: { id } });
}

export async function listPlans() {
  return prisma.publicPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createPlan(input: Record<string, unknown>) {
  const name = safeText(input.name);
  const priceLabel = safeText(input.priceLabel);
  const featuresText = safeText(input.featuresText);

  if (!name) throw new Error("Nome do plano é obrigatório.");
  if (!priceLabel) throw new Error("Preço do plano é obrigatório.");
  if (!featuresText) throw new Error("Benefícios do plano são obrigatórios.");

  return prisma.publicPlan.create({
    data: {
      name,
      priceLabel,
      billingPeriod: safeText(input.billingPeriod, "/mês") || "/mês",
      description: safeOptionalText(input.description),
      featuresText,
      badgeText: safeOptionalText(input.badgeText),
      imageUrl: safeOptionalText(input.imageUrl),
      imageAlt: safeOptionalText(input.imageAlt),
      ctaText: safeText(input.ctaText, "Assinar agora") || "Assinar agora",
      isPurchasable: safeBoolean(input.isPurchasable, true),
      moduleDashboard: safeBoolean(input.moduleDashboard, true),
      moduleClients: safeBoolean(input.moduleClients, true),
      moduleProcesses: safeBoolean(input.moduleProcesses, true),
      moduleDeadlines: safeBoolean(input.moduleDeadlines, true),
      moduleAppointments: safeBoolean(input.moduleAppointments, true),
      moduleAvailability: safeBoolean(input.moduleAvailability, true),
      moduleUsers: safeBoolean(input.moduleUsers, true),
      moduleCharges: safeBoolean(input.moduleCharges, true),
      isHighlighted: safeBoolean(input.isHighlighted, false),
      sortOrder: safeNumber(input.sortOrder, 0),
      isActive: safeBoolean(input.isActive, true),
    },
  });
}

export async function updatePlan(id: string, input: Record<string, unknown>) {
  const current = await prisma.publicPlan.findUnique({ where: { id } });
  if (!current) throw new Error("Plano não encontrado.");

  return prisma.publicPlan.update({
    where: { id },
    data: {
      name: safeText(input.name, current.name) || current.name,
      priceLabel: safeText(input.priceLabel, current.priceLabel) || current.priceLabel,
      billingPeriod:
        safeText(input.billingPeriod, current.billingPeriod) || current.billingPeriod,
      description:
        Object.prototype.hasOwnProperty.call(input, "description")
          ? safeOptionalText(input.description)
          : current.description,
      featuresText:
        safeText(input.featuresText, current.featuresText) || current.featuresText,
      badgeText:
        Object.prototype.hasOwnProperty.call(input, "badgeText")
          ? safeOptionalText(input.badgeText)
          : current.badgeText,
      imageUrl:
        Object.prototype.hasOwnProperty.call(input, "imageUrl")
          ? safeOptionalText(input.imageUrl)
          : current.imageUrl,
      imageAlt:
        Object.prototype.hasOwnProperty.call(input, "imageAlt")
          ? safeOptionalText(input.imageAlt)
          : current.imageAlt,
      ctaText:
        safeText(input.ctaText, current.ctaText) || current.ctaText,
      isPurchasable:
        Object.prototype.hasOwnProperty.call(input, "isPurchasable")
          ? safeBoolean(input.isPurchasable, current.isPurchasable)
          : current.isPurchasable,
      moduleDashboard:
        Object.prototype.hasOwnProperty.call(input, "moduleDashboard")
          ? safeBoolean(input.moduleDashboard, current.moduleDashboard)
          : current.moduleDashboard,
      moduleClients:
        Object.prototype.hasOwnProperty.call(input, "moduleClients")
          ? safeBoolean(input.moduleClients, current.moduleClients)
          : current.moduleClients,
      moduleProcesses:
        Object.prototype.hasOwnProperty.call(input, "moduleProcesses")
          ? safeBoolean(input.moduleProcesses, current.moduleProcesses)
          : current.moduleProcesses,
      moduleDeadlines:
        Object.prototype.hasOwnProperty.call(input, "moduleDeadlines")
          ? safeBoolean(input.moduleDeadlines, current.moduleDeadlines)
          : current.moduleDeadlines,
      moduleAppointments:
        Object.prototype.hasOwnProperty.call(input, "moduleAppointments")
          ? safeBoolean(input.moduleAppointments, current.moduleAppointments)
          : current.moduleAppointments,
      moduleAvailability:
        Object.prototype.hasOwnProperty.call(input, "moduleAvailability")
          ? safeBoolean(input.moduleAvailability, current.moduleAvailability)
          : current.moduleAvailability,
      moduleUsers:
        Object.prototype.hasOwnProperty.call(input, "moduleUsers")
          ? safeBoolean(input.moduleUsers, current.moduleUsers)
          : current.moduleUsers,
      moduleCharges:
        Object.prototype.hasOwnProperty.call(input, "moduleCharges")
          ? safeBoolean(input.moduleCharges, current.moduleCharges)
          : current.moduleCharges,
      isHighlighted:
        Object.prototype.hasOwnProperty.call(input, "isHighlighted")
          ? safeBoolean(input.isHighlighted, current.isHighlighted)
          : current.isHighlighted,
      sortOrder:
        Object.prototype.hasOwnProperty.call(input, "sortOrder")
          ? safeNumber(input.sortOrder, current.sortOrder)
          : current.sortOrder,
      isActive:
        Object.prototype.hasOwnProperty.call(input, "isActive")
          ? safeBoolean(input.isActive, current.isActive)
          : current.isActive,
    },
  });
}

export async function deletePlan(id: string) {
  return prisma.publicPlan.delete({ where: { id } });
}

export async function listUpdatePosts() {
  return prisma.publicUpdatePost.findMany({
    orderBy: [{ isHighlighted: "desc" }, { publishedAt: "desc" }],
  });
}

export async function createUpdatePost(input: Record<string, unknown>) {
  const title = safeText(input.title);
  const summary = safeText(input.summary);

  if (!title) throw new Error("Título da atualização é obrigatório.");
  if (!summary) throw new Error("Resumo da atualização é obrigatório.");

  return prisma.publicUpdatePost.create({
    data: {
      title,
      summary,
      category: safeText(input.category, "Novidade") || "Novidade",
      publishedAt: safeDate(input.publishedAt, new Date()),
      isPublished: safeBoolean(input.isPublished, true),
      isHighlighted: safeBoolean(input.isHighlighted, false),
    },
  });
}

export async function updateUpdatePost(id: string, input: Record<string, unknown>) {
  const current = await prisma.publicUpdatePost.findUnique({ where: { id } });
  if (!current) throw new Error("Atualização não encontrada.");

  return prisma.publicUpdatePost.update({
    where: { id },
    data: {
      title: safeText(input.title, current.title) || current.title,
      summary: safeText(input.summary, current.summary) || current.summary,
      category: safeText(input.category, current.category) || current.category,
      publishedAt:
        Object.prototype.hasOwnProperty.call(input, "publishedAt")
          ? safeDate(input.publishedAt, current.publishedAt)
          : current.publishedAt,
      isPublished:
        Object.prototype.hasOwnProperty.call(input, "isPublished")
          ? safeBoolean(input.isPublished, current.isPublished)
          : current.isPublished,
      isHighlighted:
        Object.prototype.hasOwnProperty.call(input, "isHighlighted")
          ? safeBoolean(input.isHighlighted, current.isHighlighted)
          : current.isHighlighted,
    },
  });
}

export async function deleteUpdatePost(id: string) {
  return prisma.publicUpdatePost.delete({ where: { id } });
}
const PUBLIC_SITE_PAYMENT_ID = "global-public-payment";

export async function getPublicSitePaymentConfigForAdmin() {
  const config = await prisma.publicSitePaymentConfig.findUnique({
    where: { id: PUBLIC_SITE_PAYMENT_ID },
  });

  if (!config) return null;

  return {
    id: config.id,
    provider: config.provider,
    isActive: config.isActive,
    hasAccessToken: Boolean(config.accessTokenEnc),
    hasPublicKey: Boolean(config.publicKeyEnc),
    publicKey: config.publicKeyEnc ? decryptText(config.publicKeyEnc) : "",
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

export async function savePublicSitePaymentConfig(input: Record<string, unknown>) {
  const accessToken = safeText(input.accessToken);
  const publicKey = safeOptionalText(input.publicKey);
  const isActive = safeBoolean(input.isActive, true);

  if (!accessToken) {
    throw new Error("Access Token do Mercado Pago é obrigatório.");
  }

  const validation = await validateMercadoPagoCredentials({
    accessToken,
    publicKey,
  });

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const payload = {
    provider: "MERCADO_PAGO",
    accessTokenEnc: encryptText(accessToken),
    publicKeyEnc: publicKey ? encryptText(publicKey) : null,
    isActive,
  };

  const existing = await prisma.publicSitePaymentConfig.findUnique({
    where: { id: PUBLIC_SITE_PAYMENT_ID },
  });

  if (existing) {
    return prisma.publicSitePaymentConfig.update({
      where: { id: PUBLIC_SITE_PAYMENT_ID },
      data: payload,
    });
  }

  return prisma.publicSitePaymentConfig.create({
    data: {
      id: PUBLIC_SITE_PAYMENT_ID,
      ...payload,
    },
  });
}