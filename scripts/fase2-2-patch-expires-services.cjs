const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function ensureHelper(content, anchor, helper, label) {
  if (content.includes("function calculateExpiresAt(")) {
    console.log(`OK: helper ja existe em ${label}`);
    return content;
  }

  if (!content.includes(anchor)) {
    throw new Error(`Anchor nao encontrado em ${label}`);
  }

  console.log(`PATCH: helper em ${label}`);
  return content.replace(anchor, anchor + helper);
}

function patchRecurringCreate() {
  const file = "src/services/recurring-charge.service.ts";
  let content = read(file);

  const helperAnchor = `function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\\D/g, "");
  return digits || null;
}
`;

  const helper = `

function normalizePaymentValidityDays(value?: number | null) {
  const numeric = Number(value ?? 3);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 3;
  }

  return Math.max(1, Math.floor(numeric));
}

function normalizeLateFeeType(value?: string | null) {
  return value === "PERCENT" || value === "FIXED" ? value : "NONE";
}

function normalizeLateFeeValue(type: string, value?: number | null) {
  if (type === "NONE") return null;

  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function calculateExpiresAt(baseDate: Date, paymentValidityDays: number) {
  const expiresAt = new Date(baseDate);
  expiresAt.setDate(expiresAt.getDate() + paymentValidityDays);
  expiresAt.setHours(23, 59, 59, 999);
  return expiresAt;
}
`;

  content = ensureHelper(content, helperAnchor, helper, file);

  if (!content.includes("paymentValidityDays?: number | null;")) {
    content = content.replace(
      `  interestStartsAtInstallment?: number | null;
};`,
      `  interestStartsAtInstallment?: number | null;
  paymentValidityDays?: number | null;
  lateFeeType?: string | null;
  lateFeeValue?: number | null;
};`
    );
    console.log("PATCH: tipo input recurring");
  }

  if (!content.includes("const firstExpiresAt = calculateExpiresAt(firstChargeDate, paymentValidityDays);")) {
    content = content.replace(
      /const firstAmount = calculateInstallmentAmount\([\s\S]*?input\.interestStartsAtInstallment\s*\n\s*\);/,
      (match) => `${match}

  const paymentValidityDays = normalizePaymentValidityDays(input.paymentValidityDays);
  const lateFeeType = normalizeLateFeeType(input.lateFeeType);
  const lateFeeValue = normalizeLateFeeValue(lateFeeType, input.lateFeeValue);
  const firstExpiresAt = calculateExpiresAt(firstChargeDate, paymentValidityDays);`
    );
    console.log("PATCH: calculo firstExpiresAt");
  }

  content = content.replace(
    /data:\s*\{\s*recurringChargeId:\s*recurring\.id,\s*installmentNumber:\s*1,\s*amount:\s*firstAmount,\s*dueDate:\s*firstChargeDate,\s*status:\s*"PENDING",\s*\}/,
    `data: {
      recurringChargeId: recurring.id,
      installmentNumber: 1,
      amount: firstAmount,
      dueDate: firstChargeDate,
      expiresAt: firstExpiresAt,
      lateFeeType,
      lateFeeValue,
      lateFeeApplied: false,
      status: "PENDING",
    }`
  );

  content = content.replace(
    /description:\s*input\.description,\s*\}\);/,
    `description: input.description,
    expiresAt: firstExpiresAt,
  });`
  );

  content = content.replace(
    /mercadoPagoPaymentId:\s*preference\.providerPreferenceId,\s*mercadoPagoInitPoint:\s*paymentUrl,\s*\}/,
    `mercadoPagoPaymentId: preference.providerPreferenceId,
        mercadoPagoInitPoint: paymentUrl,
        expiresAt: firstExpiresAt,
        lateFeeType,
        lateFeeValue,
      }`
  );

  content = content.replace(
    /amount:\s*new Prisma\.Decimal\(firstAmount\),\s*dueDate:\s*firstChargeDate,/,
    `amount: new Prisma.Decimal(firstAmount),
      originalAmount: new Prisma.Decimal(firstAmount),
      currentAmount: new Prisma.Decimal(firstAmount),
      dueDate: firstChargeDate,
      paymentValidityDays,
      expiresAt: firstExpiresAt,`
  );

  content = content.replace(
    /sandboxInitPoint:\s*preference\.sandboxInitPoint,\s*emailTarget:\s*client\.email \?\? null,/,
    `sandboxInitPoint: preference.sandboxInitPoint,
      lateFeeType,
      lateFeeValue,
      lateFeeApplied: false,
      emailTarget: client.email ?? null,`
  );

  content = content.replace(
    /interestStartsAtInstallment:\s*input\.interestStartsAtInstallment \?\? null,\s*nextChargeDate:/,
    `interestStartsAtInstallment: input.interestStartsAtInstallment ?? null,
      paymentValidityDays,
      lateFeeType,
      lateFeeValue,
      nextChargeDate:`
  );

  write(file, content);
}

function patchProcessor() {
  const file = "src/services/recurring-charge-processor.service.ts";
  let content = read(file);

  const helperAnchor = `function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\\D/g, "");
  return digits || null;
}
`;

  const helper = `

function normalizePaymentValidityDays(value?: number | null) {
  const numeric = Number(value ?? 3);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 3;
  }

  return Math.max(1, Math.floor(numeric));
}

function normalizeLateFeeType(value?: string | null) {
  return value === "PERCENT" || value === "FIXED" ? value : "NONE";
}

function normalizeLateFeeValue(type: string, value?: number | null) {
  if (type === "NONE") return null;

  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function calculateExpiresAt(baseDate: Date, paymentValidityDays: number) {
  const expiresAt = new Date(baseDate);
  expiresAt.setDate(expiresAt.getDate() + paymentValidityDays);
  expiresAt.setHours(23, 59, 59, 999);
  return expiresAt;
}
`;

  content = ensureHelper(content, helperAnchor, helper, file);

  if (!content.includes("const expiresAt = calculateExpiresAt(dueDate, paymentValidityDays);")) {
    content = content.replace(
      `    const dueDate = recurring.nextChargeDate;`,
      `    const dueDate = recurring.nextChargeDate;
    const paymentValidityDays = normalizePaymentValidityDays(recurring.paymentValidityDays);
    const lateFeeType = normalizeLateFeeType(recurring.lateFeeType);
    const lateFeeValue = normalizeLateFeeValue(lateFeeType, recurring.lateFeeValue);
    const expiresAt = calculateExpiresAt(dueDate, paymentValidityDays);`
    );
    console.log("PATCH: processor calculo expiresAt");
  }

  content = content.replace(
    /data:\s*\{\s*recurringChargeId:\s*recurring\.id,\s*installmentNumber:\s*nextInstallmentNumber,\s*amount,\s*dueDate,\s*status:\s*"PENDING",\s*\}/,
    `data: {
        recurringChargeId: recurring.id,
        installmentNumber: nextInstallmentNumber,
        amount,
        dueDate,
        expiresAt,
        lateFeeType,
        lateFeeValue,
        lateFeeApplied: false,
        status: "PENDING",
      }`
  );

  content = content.replace(
    /description:\s*recurring\.description,\s*\}\);/,
    `description: recurring.description,
      expiresAt,
    });`
  );

  content = content.replace(
    /mercadoPagoPaymentId:\s*preference\.providerPreferenceId,\s*mercadoPagoInitPoint:\s*paymentUrl,\s*\}/,
    `mercadoPagoPaymentId: preference.providerPreferenceId,
        mercadoPagoInitPoint: paymentUrl,
        expiresAt,
        lateFeeType,
        lateFeeValue,
      }`
  );

  content = content.replace(
    /amount:\s*new Prisma\.Decimal\(amount\),\s*dueDate:\s*dueDate,/,
    `amount: new Prisma.Decimal(amount),
        originalAmount: new Prisma.Decimal(amount),
        currentAmount: new Prisma.Decimal(amount),
        dueDate: dueDate,
        paymentValidityDays,
        expiresAt,`
  );

  content = content.replace(
    /sandboxInitPoint:\s*preference\.sandboxInitPoint,\s*emailTarget:\s*recurring\.client\.email \?\? null,/,
    `sandboxInitPoint: preference.sandboxInitPoint,
        lateFeeType,
        lateFeeValue,
        lateFeeApplied: false,
        emailTarget: recurring.client.email ?? null,`
  );

  write(file, content);
}

patchRecurringCreate();
patchProcessor();

console.log("Services corrigidos para gravar expiresAt.");
