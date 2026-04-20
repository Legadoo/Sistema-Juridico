-- CreateTable
CREATE TABLE "PublicSitePaymentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global-public-payment',
    "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
    "accessTokenEnc" TEXT NOT NULL,
    "publicKeyEnc" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
