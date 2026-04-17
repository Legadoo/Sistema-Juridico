-- CreateTable
CREATE TABLE "RecurringCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseAmount" REAL NOT NULL,
    "installments" INTEGER NOT NULL,
    "currentInstallment" INTEGER NOT NULL DEFAULT 0,
    "chargeDay" INTEGER NOT NULL,
    "hasInterest" BOOLEAN NOT NULL DEFAULT false,
    "interestPercent" REAL,
    "interestStartsAtInstallment" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nextChargeDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringCharge_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringCharge_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringCharge_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringChargeInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recurringChargeId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "mercadoPagoPaymentId" TEXT,
    "mercadoPagoInitPoint" TEXT,
    "emailSentAt" DATETIME,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringChargeInstallment_recurringChargeId_fkey" FOREIGN KEY ("recurringChargeId") REFERENCES "RecurringCharge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecurringCharge_firmId_status_idx" ON "RecurringCharge"("firmId", "status");

-- CreateIndex
CREATE INDEX "RecurringCharge_clientId_idx" ON "RecurringCharge"("clientId");

-- CreateIndex
CREATE INDEX "RecurringChargeInstallment_status_dueDate_idx" ON "RecurringChargeInstallment"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringChargeInstallment_recurringChargeId_installmentNumber_key" ON "RecurringChargeInstallment"("recurringChargeId", "installmentNumber");
