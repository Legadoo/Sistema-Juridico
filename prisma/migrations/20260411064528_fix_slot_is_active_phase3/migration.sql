-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AvailabilitySlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bookedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firmId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    CONSTRAINT "AvailabilitySlot_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AvailabilitySlot_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "AvailabilityWindow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AvailabilitySlot" ("bookedAt", "createdAt", "endAt", "firmId", "id", "isBooked", "startAt", "updatedAt", "windowId") SELECT "bookedAt", "createdAt", "endAt", "firmId", "id", "isBooked", "startAt", "updatedAt", "windowId" FROM "AvailabilitySlot";
DROP TABLE "AvailabilitySlot";
ALTER TABLE "new_AvailabilitySlot" RENAME TO "AvailabilitySlot";
CREATE INDEX "AvailabilitySlot_firmId_idx" ON "AvailabilitySlot"("firmId");
CREATE INDEX "AvailabilitySlot_windowId_idx" ON "AvailabilitySlot"("windowId");
CREATE INDEX "AvailabilitySlot_startAt_idx" ON "AvailabilitySlot"("startAt");
CREATE UNIQUE INDEX "AvailabilitySlot_windowId_startAt_key" ON "AvailabilitySlot"("windowId", "startAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
