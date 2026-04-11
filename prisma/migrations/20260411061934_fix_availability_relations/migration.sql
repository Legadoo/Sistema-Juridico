-- CreateTable
CREATE TABLE "AvailabilityWindow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotIntervalMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firmId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    CONSTRAINT "AvailabilityWindow_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AvailabilityWindow_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "bookedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firmId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    CONSTRAINT "AvailabilitySlot_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AvailabilitySlot_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "AvailabilityWindow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduledAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'AGENDADO',
    "source" TEXT NOT NULL DEFAULT 'INTERNAL',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "availabilitySlotId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    CONSTRAINT "Appointment_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_availabilitySlotId_fkey" FOREIGN KEY ("availabilitySlotId") REFERENCES "AvailabilitySlot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("clientId", "createdAt", "createdByUserId", "durationMinutes", "firmId", "id", "notes", "scheduledAt", "source", "status", "updatedAt") SELECT "clientId", "createdAt", "createdByUserId", "durationMinutes", "firmId", "id", "notes", "scheduledAt", "source", "status", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE UNIQUE INDEX "Appointment_availabilitySlotId_key" ON "Appointment"("availabilitySlotId");
CREATE INDEX "Appointment_firmId_idx" ON "Appointment"("firmId");
CREATE INDEX "Appointment_clientId_idx" ON "Appointment"("clientId");
CREATE INDEX "Appointment_createdByUserId_idx" ON "Appointment"("createdByUserId");
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AvailabilityWindow_firmId_idx" ON "AvailabilityWindow"("firmId");

-- CreateIndex
CREATE INDEX "AvailabilityWindow_date_idx" ON "AvailabilityWindow"("date");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_firmId_idx" ON "AvailabilitySlot"("firmId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_windowId_idx" ON "AvailabilitySlot"("windowId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_startAt_idx" ON "AvailabilitySlot"("startAt");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySlot_windowId_startAt_key" ON "AvailabilitySlot"("windowId", "startAt");
