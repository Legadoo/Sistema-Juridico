-- CreateTable
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "publicKeyEnc" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "enabledBySuperadmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentGatewayConfig_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "processId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPreferenceId" TEXT,
    "providerPaymentId" TEXT,
    "externalReference" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentUrl" TEXT,
    "initPoint" TEXT,
    "sandboxInitPoint" TEXT,
    "emailTarget" TEXT,
    "phoneTarget" TEXT,
    "emailSentAt" DATETIME,
    "whatsappPreparedAt" DATETIME,
    "paidAt" DATETIME,
    "lastWebhookAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Charge_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Charge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Charge_processId_fkey" FOREIGN KEY ("processId") REFERENCES "LegalProcess" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Charge_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayConfig_firmId_key" ON "PaymentGatewayConfig"("firmId");

-- CreateIndex
CREATE INDEX "PaymentGatewayConfig_firmId_idx" ON "PaymentGatewayConfig"("firmId");

-- CreateIndex
CREATE UNIQUE INDEX "Charge_externalReference_key" ON "Charge"("externalReference");

-- CreateIndex
CREATE INDEX "Charge_firmId_status_idx" ON "Charge"("firmId", "status");

-- CreateIndex
CREATE INDEX "Charge_clientId_idx" ON "Charge"("clientId");

-- CreateIndex
CREATE INDEX "Charge_processId_idx" ON "Charge"("processId");

-- CreateIndex
CREATE INDEX "Charge_createdByUserId_idx" ON "Charge"("createdByUserId");
