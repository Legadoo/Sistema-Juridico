-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FirmConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "maxClients" INTEGER NOT NULL DEFAULT 50,
    "moduleDashboard" BOOLEAN NOT NULL DEFAULT true,
    "moduleClients" BOOLEAN NOT NULL DEFAULT true,
    "moduleProcesses" BOOLEAN NOT NULL DEFAULT true,
    "moduleDeadlines" BOOLEAN NOT NULL DEFAULT true,
    "moduleAppointments" BOOLEAN NOT NULL DEFAULT true,
    "moduleAvailability" BOOLEAN NOT NULL DEFAULT true,
    "moduleUsers" BOOLEAN NOT NULL DEFAULT true,
    "moduleCharges" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FirmConfig_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FirmConfig" ("createdAt", "firmId", "id", "maxClients", "updatedAt") SELECT "createdAt", "firmId", "id", "maxClients", "updatedAt" FROM "FirmConfig";
DROP TABLE "FirmConfig";
ALTER TABLE "new_FirmConfig" RENAME TO "FirmConfig";
CREATE UNIQUE INDEX "FirmConfig_firmId_key" ON "FirmConfig"("firmId");
CREATE TABLE "new_PublicPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "priceLabel" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL DEFAULT '/mês',
    "description" TEXT,
    "featuresText" TEXT NOT NULL,
    "badgeText" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "ctaText" TEXT NOT NULL DEFAULT 'Assinar agora',
    "isPurchasable" BOOLEAN NOT NULL DEFAULT true,
    "moduleDashboard" BOOLEAN NOT NULL DEFAULT true,
    "moduleClients" BOOLEAN NOT NULL DEFAULT true,
    "moduleProcesses" BOOLEAN NOT NULL DEFAULT true,
    "moduleDeadlines" BOOLEAN NOT NULL DEFAULT true,
    "moduleAppointments" BOOLEAN NOT NULL DEFAULT true,
    "moduleAvailability" BOOLEAN NOT NULL DEFAULT true,
    "moduleUsers" BOOLEAN NOT NULL DEFAULT true,
    "moduleCharges" BOOLEAN NOT NULL DEFAULT true,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PublicPlan" ("badgeText", "billingPeriod", "createdAt", "ctaText", "description", "featuresText", "id", "imageAlt", "imageUrl", "isActive", "isHighlighted", "isPurchasable", "name", "priceLabel", "sortOrder", "updatedAt") SELECT "badgeText", "billingPeriod", "createdAt", "ctaText", "description", "featuresText", "id", "imageAlt", "imageUrl", "isActive", "isHighlighted", "isPurchasable", "name", "priceLabel", "sortOrder", "updatedAt" FROM "PublicPlan";
DROP TABLE "PublicPlan";
ALTER TABLE "new_PublicPlan" RENAME TO "PublicPlan";
CREATE INDEX "PublicPlan_sortOrder_idx" ON "PublicPlan"("sortOrder");
CREATE INDEX "PublicPlan_isActive_idx" ON "PublicPlan"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
