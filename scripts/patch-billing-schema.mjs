import fs from "fs";

const schemaPath = "A:/git/Sistema Juridico/prisma/schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

function removeEnumBlock(source, enumName) {
  const regex = new RegExp(`\\nenum\\s+${enumName}\\s+\\{[\\s\\S]*?\\n\\}`, "m");
  return source.replace(regex, "");
}

function insertRelationField(source, modelName, fieldLine) {
  const regex = new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\n\\}`, "m");
  const match = source.match(regex);
  if (!match) {
    throw new Error(`Model ${modelName} não encontrado.`);
  }

  const block = match[0];
  if (block.includes(fieldLine.trim())) {
    return source;
  }

  const updatedBlock = block.replace(/\n\}$/, `\n  ${fieldLine}\n}`);
  return source.replace(block, updatedBlock);
}

function appendModelIfMissing(source, modelName, modelBlock) {
  if (source.includes(`model ${modelName} {`)) {
    return source;
  }

  return `${source.trim()}\n\n${modelBlock.trim()}\n`;
}

function replaceModelBlock(source, modelName, modelBlock) {
  const regex = new RegExp(`model\\s+${modelName}\\s+\\{[\\s\\S]*?\\n\\}`, "m");
  if (!regex.test(source)) {
    return appendModelIfMissing(source, modelName, modelBlock);
  }
  return source.replace(regex, modelBlock.trim());
}

schema = removeEnumBlock(schema, "PaymentProvider");
schema = removeEnumBlock(schema, "ChargeStatus");

schema = insertRelationField(schema, "LawFirm", "paymentGatewayConfig PaymentGatewayConfig?");
schema = insertRelationField(schema, "LawFirm", "charges              Charge[]");

schema = insertRelationField(schema, "Client", "charges Charge[]");
schema = insertRelationField(schema, "LegalProcess", "charges Charge[]");
schema = insertRelationField(schema, "User", "createdCharges Charge[]");

schema = replaceModelBlock(schema, "PaymentGatewayConfig", `
model PaymentGatewayConfig {
  id                  String    @id @default(cuid())
  firmId              String    @unique
  provider            String
  accessTokenEnc      String
  publicKeyEnc        String?
  isActive            Boolean   @default(false)
  enabledBySuperadmin Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  firm                LawFirm   @relation(fields: [firmId], references: [id], onDelete: Cascade)

  @@index([firmId])
}
`);

schema = replaceModelBlock(schema, "Charge", `
model Charge {
  id                    String         @id @default(cuid())
  firmId                String
  clientId              String
  processId             String?
  createdByUserId       String

  provider              String
  providerPreferenceId  String?
  providerPaymentId     String?
  externalReference     String         @unique

  amount                Decimal
  message               String?
  status                String         @default("PENDING")

  paymentUrl            String?
  initPoint             String?
  sandboxInitPoint      String?

  emailTarget           String?
  phoneTarget           String?

  emailSentAt           DateTime?
  whatsappPreparedAt    DateTime?
  paidAt                DateTime?
  lastWebhookAt         DateTime?

  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt

  firm                  LawFirm        @relation(fields: [firmId], references: [id], onDelete: Cascade)
  client                Client         @relation(fields: [clientId], references: [id], onDelete: Cascade)
  process               LegalProcess?  @relation(fields: [processId], references: [id], onDelete: SetNull)
  createdByUser         User           @relation(fields: [createdByUserId], references: [id], onDelete: Cascade)

  @@index([firmId, status])
  @@index([clientId])
  @@index([processId])
  @@index([createdByUserId])
}
`);

fs.writeFileSync(schemaPath, schema, { encoding: "utf8" });
console.log("Schema patch aplicado com sucesso.");