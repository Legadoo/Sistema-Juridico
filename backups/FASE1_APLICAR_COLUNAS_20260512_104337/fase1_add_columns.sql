ALTER TABLE "Charge" ADD COLUMN "originalAmount" DECIMAL;
ALTER TABLE "Charge" ADD COLUMN "currentAmount" DECIMAL;
ALTER TABLE "Charge" ADD COLUMN "paymentValidityDays" INTEGER;
ALTER TABLE "Charge" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "Charge" ADD COLUMN "expiredAt" DATETIME;
ALTER TABLE "Charge" ADD COLUMN "lateFeeType" TEXT;
ALTER TABLE "Charge" ADD COLUMN "lateFeeValue" REAL;
ALTER TABLE "Charge" ADD COLUMN "lateFeeApplied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Charge" ADD COLUMN "lateFeeAppliedAt" DATETIME;
ALTER TABLE "Charge" ADD COLUMN "previousChargeId" TEXT;
ALTER TABLE "Charge" ADD COLUMN "replacedByChargeId" TEXT;

ALTER TABLE "RecurringCharge" ADD COLUMN "paymentValidityDays" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "RecurringCharge" ADD COLUMN "lateFeeType" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "RecurringCharge" ADD COLUMN "lateFeeValue" REAL;

ALTER TABLE "RecurringChargeInstallment" ADD COLUMN "expiresAt" DATETIME;
ALTER TABLE "RecurringChargeInstallment" ADD COLUMN "expiredAt" DATETIME;
ALTER TABLE "RecurringChargeInstallment" ADD COLUMN "lateFeeType" TEXT;
ALTER TABLE "RecurringChargeInstallment" ADD COLUMN "lateFeeValue" REAL;
ALTER TABLE "RecurringChargeInstallment" ADD COLUMN "lateFeeAmount" REAL;
ALTER TABLE "RecurringChargeInstallment" ADD COLUMN "lateFeeApplied" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RecurringChargeInstallment" ADD COLUMN "lateFeeAppliedAt" DATETIME;
ALTER TABLE "RecurringChargeInstallment" ADD COLUMN "previousInstallmentId" TEXT;
ALTER TABLE "RecurringChargeInstallment" ADD COLUMN "replacedByInstallmentId" TEXT;

CREATE INDEX IF NOT EXISTS "Charge_expiresAt_idx" ON "Charge"("expiresAt");
CREATE INDEX IF NOT EXISTS "Charge_previousChargeId_idx" ON "Charge"("previousChargeId");
CREATE INDEX IF NOT EXISTS "Charge_replacedByChargeId_idx" ON "Charge"("replacedByChargeId");

CREATE INDEX IF NOT EXISTS "RecurringCharge_nextChargeDate_idx" ON "RecurringCharge"("nextChargeDate");

CREATE INDEX IF NOT EXISTS "RecurringChargeInstallment_expiresAt_idx" ON "RecurringChargeInstallment"("expiresAt");
CREATE INDEX IF NOT EXISTS "RecurringChargeInstallment_previousInstallmentId_idx" ON "RecurringChargeInstallment"("previousInstallmentId");
CREATE INDEX IF NOT EXISTS "RecurringChargeInstallment_replacedByInstallmentId_idx" ON "RecurringChargeInstallment"("replacedByInstallmentId");
