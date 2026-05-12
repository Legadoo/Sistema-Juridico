const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function ensureContains(content, text, insertAfter, insertText, label) {
  if (content.includes(text)) {
    console.log(`OK: ${label}`);
    return content;
  }

  if (!content.includes(insertAfter)) {
    throw new Error(`Trecho base nao encontrado para ${label}`);
  }

  console.log(`PATCH: ${label}`);
  return content.replace(insertAfter, insertAfter + insertText);
}

function replaceIfContains(content, oldText, newText, label) {
  if (!content.includes(oldText)) {
    console.log(`SKIP: ${label}`);
    return content;
  }

  console.log(`PATCH: ${label}`);
  return content.replace(oldText, newText);
}

function patchRecurringCreateService() {
  const file = "src/services/recurring-charge.service.ts";
  let content = read(file);

  // 1. Garantir helpers
  content = ensureContains(
    content,
    "function calculateExpiresAt(",
    `function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
`,
    `
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
`,
    "helpers recurring-charge"
  );

  // 2. Garantir input type
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
    console.log("PATCH: input type recurring");
  }

  // 3. Garantir cálculo firstExpiresAt
  if (!content.includes("const firstExpiresAt = calculateExpiresAt(firstChargeDate, paymentValidityDays);")) {
    content = content.replace(
      `  const firstAmount = calculateInstallmentAmount(
    input.baseAmount,
    input.installments,
    1,
    input.hasInterest,
    input.interestPercent,
    input.interestStartsAtInstallment
  );`,
      `  const firstAmount = calculateInstallmentAmount(
    input.baseAmount,
    input.installments,
    1,
    input.hasInterest,
    input.interestPercent,
    input.interestStartsAtInstallment
  );

  const paymentValidityDays = normalizePaymentValidityDays(input.paymentValidityDays);
  const lateFeeType = normalizeLateFeeType(input.lateFeeType);
  const lateFeeValue = normalizeLateFeeValue(lateFeeType, input.lateFeeValue);
  const firstExpiresAt = calculateExpiresAt(firstChargeDate, paymentValidityDays);`
    );
    console.log("PATCH: calculo firstExpiresAt");
  }

  // 4. Garantir RecurringCharge salva config
  if (!content.includes("paymentValidityDays,") || !content.includes("lateFeeType,") || !content.includes("lateFeeValue,")) {
    content = content.replace(
      `      interestPercent: input.interestPercent ?? null,
      interestStartsAtInstallment: input.interestStartsAtInstallment ?? null,
      nextChargeDate: addMonths(firstChargeDate, 1),`,
      `      interestPercent: input.interestPercent ?? null,
      interestStartsAtInstallment: input.interestStartsAtInstallment ?? null,
      paymentValidityDays,
      lateFeeType,
      lateFeeValue,
      nextChargeDate: addMonths(firstChargeDate, 1),`
    );
    console.log("PATCH: recurring config");
  }

  // 5. Garantir primeira installment salva expiresAt
  if (!content.includes("expiresAt: firstExpiresAt")) {
    content = content.replace(
      `      amount: firstAmount,
      dueDate: firstChargeDate,
      status: "PENDING",`,
      `      amount: firstAmount,
      dueDate: firstChargeDate,
      expiresAt: firstExpiresAt,
      lateFeeType,
      lateFeeValue,
      lateFeeApplied: false,
      status: "PENDING",`
    );
    console.log("PATCH: first installment expiresAt");
  }

  // 6. Garantir Mercado Pago recebe expiresAt
  if (!content.includes("expiresAt: firstExpiresAt,")) {
    content = content.replace(
      `    payerEmail: client.email ?? null,
    description: input.description,
  });`,
      `    payerEmail: client.email ?? null,
    description: input.description,
    expiresAt: firstExpiresAt,
  });`
    );
    console.log("PATCH: mercado pago first expiresAt");
  }

  // 7. Garantir update installment mantém expiresAt
  if (!content.includes("mercadoPagoInitPoint: paymentUrl,\n      expiresAt: firstExpiresAt")) {
    content = content.replace(
      `      mercadoPagoPaymentId: preference.providerPreferenceId,
      mercadoPagoInitPoint: paymentUrl,`,
      `      mercadoPagoPaymentId: preference.providerPreferenceId,
      mercadoPagoInitPoint: paymentUrl,
      expiresAt: firstExpiresAt,
      lateFeeType,
      lateFeeValue,`
    );
    console.log("PATCH: update installment expiresAt");
  }

  // 8. Garantir Charge salva expiresAt
  if (!content.includes("originalAmount: new Prisma.Decimal(firstAmount),")) {
    content = content.replace(
      `      amount: new Prisma.Decimal(firstAmount),
      dueDate: firstChargeDate,`,
      `      amount: new Prisma.Decimal(firstAmount),
      originalAmount: new Prisma.Decimal(firstAmount),
      currentAmount: new Prisma.Decimal(firstAmount),
      dueDate: firstChargeDate,
      paymentValidityDays,
      expiresAt: firstExpiresAt,`
    );
    console.log("PATCH: charge original/current/expiresAt");
  }

  if (!content.includes("lateFeeApplied: false,\n      emailTarget: client.email")) {
    content = content.replace(
      `      sandboxInitPoint: preference.sandboxInitPoint,
      emailTarget: client.email ?? null,`,
      `      sandboxInitPoint: preference.sandboxInitPoint,
      lateFeeType,
      lateFeeValue,
      lateFeeApplied: false,
      emailTarget: client.email ?? null,`
    );
    console.log("PATCH: charge late fee config");
  }

  write(file, content);
}

function patchRecurringProcessorService() {
  const file = "src/services/recurring-charge-processor.service.ts";
  let content = read(file);

  content = ensureContains(
    content,
    "function calculateExpiresAt(",
    `function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\\D/g, "");
  return digits || null;
}
`,
    `
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
`,
    "helpers processor"
  );

  if (!content.includes("const expiresAt = calculateExpiresAt(dueDate, paymentValidityDays);")) {
    content = content.replace(
      `    const dueDate = recurring.nextChargeDate;

    const createdInstallment = await prisma.recurringChargeInstallment.create({`,
      `    const dueDate = recurring.nextChargeDate;
    const paymentValidityDays = normalizePaymentValidityDays(recurring.paymentValidityDays);
    const lateFeeType = normalizeLateFeeType(recurring.lateFeeType);
    const lateFeeValue = normalizeLateFeeValue(lateFeeType, recurring.lateFeeValue);
    const expiresAt = calculateExpiresAt(dueDate, paymentValidityDays);

    const createdInstallment = await prisma.recurringChargeInstallment.create({`
    );
    console.log("PATCH: processor calculate expiresAt");
  }

  if (!content.includes("expiresAt,\n        lateFeeType,")) {
    content = content.replace(
      `        amount,
        dueDate,
        status: "PENDING",`,
      `        amount,
        dueDate,
        expiresAt,
        lateFeeType,
        lateFeeValue,
        lateFeeApplied: false,
        status: "PENDING",`
    );
    console.log("PATCH: processor installment expiresAt");
  }

  if (!content.includes("description: recurring.description,\n      expiresAt,")) {
    content = content.replace(
      `      payerEmail: recurring.client.email ?? null,
      description: recurring.description,
    });`,
      `      payerEmail: recurring.client.email ?? null,
      description: recurring.description,
      expiresAt,
    });`
    );
    console.log("PATCH: processor mercado pago expiresAt");
  }

  if (!content.includes("mercadoPagoInitPoint: paymentUrl,\n        expiresAt,")) {
    content = content.replace(
      `        mercadoPagoPaymentId: preference.providerPreferenceId,
        mercadoPagoInitPoint: paymentUrl,`,
      `        mercadoPagoPaymentId: preference.providerPreferenceId,
        mercadoPagoInitPoint: paymentUrl,
        expiresAt,
        lateFeeType,
        lateFeeValue,`
    );
    console.log("PATCH: processor update installment expiresAt");
  }

  if (!content.includes("originalAmount: new Prisma.Decimal(amount),")) {
    content = content.replace(
      `        amount: new Prisma.Decimal(amount),
        dueDate: dueDate,`,
      `        amount: new Prisma.Decimal(amount),
        originalAmount: new Prisma.Decimal(amount),
        currentAmount: new Prisma.Decimal(amount),
        dueDate: dueDate,
        paymentValidityDays,
        expiresAt,`
    );
    console.log("PATCH: processor charge expiresAt");
  }

  if (!content.includes("lateFeeApplied: false,\n        emailTarget: recurring.client.email")) {
    content = content.replace(
      `        sandboxInitPoint: preference.sandboxInitPoint,
        emailTarget: recurring.client.email ?? null,`,
      `        sandboxInitPoint: preference.sandboxInitPoint,
        lateFeeType,
        lateFeeValue,
        lateFeeApplied: false,
        emailTarget: recurring.client.email ?? null,`
    );
    console.log("PATCH: processor charge late fee");
  }

  write(file, content);
}

patchRecurringCreateService();
patchRecurringProcessorService();

console.log("");
console.log("Patch Fase 2.1 concluido.");
