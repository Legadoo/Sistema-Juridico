-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PublicPlan" ("badgeText", "billingPeriod", "createdAt", "description", "featuresText", "id", "isActive", "isHighlighted", "name", "priceLabel", "sortOrder", "updatedAt") SELECT "badgeText", "billingPeriod", "createdAt", "description", "featuresText", "id", "isActive", "isHighlighted", "name", "priceLabel", "sortOrder", "updatedAt" FROM "PublicPlan";
DROP TABLE "PublicPlan";
ALTER TABLE "new_PublicPlan" RENAME TO "PublicPlan";
CREATE INDEX "PublicPlan_sortOrder_idx" ON "PublicPlan"("sortOrder");
CREATE INDEX "PublicPlan_isActive_idx" ON "PublicPlan"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
