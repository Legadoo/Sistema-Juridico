-- CreateTable
CREATE TABLE "LandingPageConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global-public-site',
    "brandName" TEXT NOT NULL DEFAULT 'JURIDICVAS',
    "heroTitle" TEXT NOT NULL DEFAULT 'Gestão jurídica premium para escritórios que querem crescer com organização.',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Centralize clientes, processos, prazos, agendamentos e cobranças em uma plataforma moderna, profissional e acessível.',
    "heroPrimaryButtonText" TEXT NOT NULL DEFAULT 'Entrar',
    "heroSecondaryButtonText" TEXT NOT NULL DEFAULT 'Acompanhar',
    "aboutTitle" TEXT NOT NULL DEFAULT 'Sobre o sistema',
    "aboutText" TEXT NOT NULL DEFAULT 'O JURIDICVAS foi criado para profissionalizar a operação jurídica com mais controle, imagem profissional e praticidade no dia a dia.',
    "featuresTitle" TEXT NOT NULL DEFAULT 'Funcionalidades',
    "featuresSubtitle" TEXT NOT NULL DEFAULT 'Tudo o que seu escritório precisa para operar com segurança e organização.',
    "mediaTitle" TEXT NOT NULL DEFAULT 'Veja o sistema em ação',
    "mediaSubtitle" TEXT NOT NULL DEFAULT 'Apresente telas, GIFs e demonstrações do produto em uma experiência premium.',
    "plansTitle" TEXT NOT NULL DEFAULT 'Planos',
    "plansSubtitle" TEXT NOT NULL DEFAULT 'Escolha o plano ideal para o seu momento.',
    "updatesTitle" TEXT NOT NULL DEFAULT 'Atualizações',
    "updatesSubtitle" TEXT NOT NULL DEFAULT 'Acompanhe novidades, melhorias e lançamentos do sistema.',
    "ctaTitle" TEXT NOT NULL DEFAULT 'Pronto para elevar o nível da sua operação jurídica?',
    "ctaSubtitle" TEXT NOT NULL DEFAULT 'Entre agora ou acompanhe seu processo em um ambiente moderno, seguro e profissional.',
    "footerText" TEXT NOT NULL DEFAULT 'JURIDICVAS - Plataforma jurídica premium.',
    "loginUrl" TEXT NOT NULL DEFAULT '/login',
    "trackUrl" TEXT NOT NULL DEFAULT '/acompanhar',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LandingFeature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LandingMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'image',
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "section" TEXT NOT NULL DEFAULT 'hero',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PublicPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priceLabel" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL DEFAULT '/mês',
    "description" TEXT,
    "featuresText" TEXT NOT NULL,
    "badgeText" TEXT,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PublicUpdatePost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Novidade',
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "LandingFeature_sortOrder_idx" ON "LandingFeature"("sortOrder");

-- CreateIndex
CREATE INDEX "LandingFeature_isActive_idx" ON "LandingFeature"("isActive");

-- CreateIndex
CREATE INDEX "LandingMedia_section_sortOrder_idx" ON "LandingMedia"("section", "sortOrder");

-- CreateIndex
CREATE INDEX "LandingMedia_isActive_idx" ON "LandingMedia"("isActive");

-- CreateIndex
CREATE INDEX "PublicPlan_sortOrder_idx" ON "PublicPlan"("sortOrder");

-- CreateIndex
CREATE INDEX "PublicPlan_isActive_idx" ON "PublicPlan"("isActive");

-- CreateIndex
CREATE INDEX "PublicUpdatePost_publishedAt_idx" ON "PublicUpdatePost"("publishedAt");

-- CreateIndex
CREATE INDEX "PublicUpdatePost_isPublished_idx" ON "PublicUpdatePost"("isPublished");
