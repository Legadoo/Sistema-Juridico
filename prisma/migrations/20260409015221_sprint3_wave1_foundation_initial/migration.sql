-- CreateTable
CREATE TABLE "LawFirm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FirmConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmId" TEXT NOT NULL,
    "maxClients" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FirmConfig_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "accessCode" TEXT NOT NULL,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firmId" TEXT,
    "assignedLawyerId" TEXT,
    CONSTRAINT "Client_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Client_assignedLawyerId_fkey" FOREIGN KEY ("assignedLawyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("accessCode", "archived", "createdAt", "document", "email", "id", "name", "notes", "phone", "updatedAt") SELECT "accessCode", "archived", "createdAt", "document", "email", "id", "name", "notes", "phone", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE INDEX "Client_firmId_idx" ON "Client"("firmId");
CREATE INDEX "Client_assignedLawyerId_idx" ON "Client"("assignedLawyerId");
CREATE TABLE "new_LegalProcess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cnj" TEXT NOT NULL,
    "tribunal" TEXT,
    "vara" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "firmId" TEXT,
    "clientId" TEXT NOT NULL,
    "assignedLawyerId" TEXT,
    CONSTRAINT "LegalProcess_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LegalProcess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LegalProcess_assignedLawyerId_fkey" FOREIGN KEY ("assignedLawyerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LegalProcess" ("archived", "clientId", "cnj", "createdAt", "id", "notes", "startDate", "status", "tribunal", "updatedAt", "vara") SELECT "archived", "clientId", "cnj", "createdAt", "id", "notes", "startDate", "status", "tribunal", "updatedAt", "vara" FROM "LegalProcess";
DROP TABLE "LegalProcess";
ALTER TABLE "new_LegalProcess" RENAME TO "LegalProcess";
CREATE INDEX "LegalProcess_firmId_idx" ON "LegalProcess"("firmId");
CREATE INDEX "LegalProcess_clientId_idx" ON "LegalProcess"("clientId");
CREATE INDEX "LegalProcess_assignedLawyerId_idx" ON "LegalProcess"("assignedLawyerId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SECRETARY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firmId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "LawFirm" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("active", "createdAt", "email", "id", "name", "password", "role", "updatedAt") SELECT "active", "createdAt", "email", "id", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LawFirm_slug_key" ON "LawFirm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FirmConfig_firmId_key" ON "FirmConfig"("firmId");
