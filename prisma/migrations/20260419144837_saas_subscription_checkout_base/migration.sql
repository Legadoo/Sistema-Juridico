-- CreateTable
CREATE TABLE "SaaSSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "publicPlanId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO',
    "providerPreferenceId" TEXT,
    "providerPaymentId" TEXT,
    "externalReference" TEXT NOT NULL,
    "checkoutUrl" TEXT,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaaSSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaaSSubscription_publicPlanId_fkey" FOREIGN KEY ("publicPlanId") REFERENCES "PublicPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SaaSSubscription_externalReference_key" ON "SaaSSubscription"("externalReference");

-- CreateIndex
CREATE INDEX "SaaSSubscription_userId_status_idx" ON "SaaSSubscription"("userId", "status");

-- CreateIndex
CREATE INDEX "SaaSSubscription_publicPlanId_idx" ON "SaaSSubscription"("publicPlanId");
