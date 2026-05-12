const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function patch(file, label, fn) {
  let content = read(file);
  const original = content;
  content = fn(content);

  if (content === original) {
    console.log(`SKIP/OK: ${label}`);
  } else {
    write(file, content);
    console.log(`PATCH: ${label}`);
  }
}

function replaceRequired(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Trecho nao encontrado: ${label}`);
  }
  return content.replace(search, replacement);
}

patch("src/services/charge.service.ts", "charge.service validade", (content) => {
  if (!content.includes("paymentValidityDays?: number | null;")) {
    content = content.replace(
      /(\s+message\?: string \| null;\r?\n)(\}\) \{)/,
      `$1  paymentValidityDays?: number | null;\n  lateFeeType?: string | null;\n  lateFeeValue?: number | null;\n$2`
    );
  }

  if (!content.includes("const paymentValidityDays =")) {
    content = replaceRequired(
      content,
      `  const externalReference = \`charge_\${params.firmId}_\${params.clientId}_\${Date.now()}\`;\n\n  const preference = await createMercadoPagoPreference(credentials, {`,
      `  const externalReference = \`charge_\${params.firmId}_\${params.clientId}_\${Date.now()}\`;\n\n  const paymentValidityDays =\n    params.paymentValidityDays && Number.isFinite(Number(params.paymentValidityDays))\n      ? Math.max(1, Math.floor(Number(params.paymentValidityDays)))\n      : null;\n\n  const expiresAt = paymentValidityDays\n    ? new Date(Date.now() + paymentValidityDays * 24 * 60 * 60 * 1000)\n    : null;\n\n  const lateFeeType =\n    params.lateFeeType === "PERCENT" || params.lateFeeType === "FIXED"\n      ? params.lateFeeType\n      : "NONE";\n\n  const lateFeeValue =\n    lateFeeType === "NONE" ? null : Number(params.lateFeeValue ?? 0);\n\n  const preference = await createMercadoPagoPreference(credentials, {`,
      "charge externalReference validade"
    );
  }

  if (!content.includes("expiresAt,") || !content.includes("description: chargeMessageOrDefault(params.message),\n    expiresAt,")) {
    content = content.replace(
      `    description: chargeMessageOrDefault(params.message),\n  });`,
      `    description: chargeMessageOrDefault(params.message),\n    expiresAt,\n  });`
    );
  }

  if (!content.includes("originalAmount: new Prisma.Decimal(params.amount),")) {
    content = content.replace(
      `      amount: new Prisma.Decimal(params.amount),\n      dueDate: params.dueDate ? new Date(params.dueDate) : null,`,
      `      amount: new Prisma.Decimal(params.amount),\n      originalAmount: new Prisma.Decimal(params.amount),\n      currentAmount: new Prisma.Decimal(params.amount),\n      dueDate: params.dueDate ? new Date(params.dueDate) : null,\n      paymentValidityDays,\n      expiresAt,`
    );
  }

  if (!content.includes("lateFeeType,\n      lateFeeValue,")) {
    content = content.replace(
      `      sandboxInitPoint: preference.sandboxInitPoint,\n      emailTarget: client.email ?? null,`,
      `      sandboxInitPoint: preference.sandboxInitPoint,\n      lateFeeType,\n      lateFeeValue,\n      lateFeeApplied: false,\n      emailTarget: client.email ?? null,`
    );
  }

  return content;
});

patch("src/services/recurring-charge.service.ts", "recurring-charge.service validade", (content) => {
  if (!content.includes("paymentValidityDays?: number | null;")) {
    content = content.replace(
      `  interestStartsAtInstallment?: number | null;\n};`,
      `  interestStartsAtInstallment?: number | null;\n  paymentValidityDays?: number | null;\n  lateFeeType?: string | null;\n  lateFeeValue?: number | null;\n};`
    );
  }

  if (!content.includes("function normalizePaymentValidityDays")) {
    content = content.replace(
      `function formatCurrency(value: number) {\n  return new Intl.NumberFormat("pt-BR", {\n    style: "currency",\n    currency: "BRL",\n  }).format(value);\n}\n`,
      `function formatCurrency(value: number) {\n  return new Intl.NumberFormat("pt-BR", {\n    style: "currency",\n    currency: "BRL",\n  }).format(value);\n}\n\nfunction normalizePaymentValidityDays(value?: number | null) {\n  const numeric = Number(value ?? 3);\n\n  if (!Number.isFinite(numeric) || numeric <= 0) {\n    return 3;\n  }\n\n  return Math.max(1, Math.floor(numeric));\n}\n\nfunction normalizeLateFeeType(value?: string | null) {\n  return value === "PERCENT" || value === "FIXED" ? value : "NONE";\n}\n\nfunction normalizeLateFeeValue(type: string, value?: number | null) {\n  if (type === "NONE") return null;\n\n  const numeric = Number(value ?? 0);\n  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;\n}\n\nfunction calculateExpiresAt(baseDate: Date, paymentValidityDays: number) {\n  const expiresAt = new Date(baseDate);\n  expiresAt.setDate(expiresAt.getDate() + paymentValidityDays);\n  expiresAt.setHours(23, 59, 59, 999);\n  return expiresAt;\n}\n`
    );
  }

  if (!content.includes("const paymentValidityDays = normalizePaymentValidityDays(input.paymentValidityDays);")) {
    content = content.replace(
      `  const firstAmount = calculateInstallmentAmount(\n    input.baseAmount,\n    input.installments,\n    1,\n    input.hasInterest,\n    input.interestPercent,\n    input.interestStartsAtInstallment\n  );`,
      `  const firstAmount = calculateInstallmentAmount(\n    input.baseAmount,\n    input.installments,\n    1,\n    input.hasInterest,\n    input.interestPercent,\n    input.interestStartsAtInstallment\n  );\n\n  const paymentValidityDays = normalizePaymentValidityDays(input.paymentValidityDays);\n  const lateFeeType = normalizeLateFeeType(input.lateFeeType);\n  const lateFeeValue = normalizeLateFeeValue(lateFeeType, input.lateFeeValue);\n  const firstExpiresAt = calculateExpiresAt(firstChargeDate, paymentValidityDays);`
    );
  }

  if (!content.includes("paymentValidityDays,\n      lateFeeType,\n      lateFeeValue,")) {
    content = content.replace(
      `      interestPercent: input.interestPercent ?? null,\n      interestStartsAtInstallment: input.interestStartsAtInstallment ?? null,\n      nextChargeDate: addMonths(firstChargeDate, 1),`,
      `      interestPercent: input.interestPercent ?? null,\n      interestStartsAtInstallment: input.interestStartsAtInstallment ?? null,\n      paymentValidityDays,\n      lateFeeType,\n      lateFeeValue,\n      nextChargeDate: addMonths(firstChargeDate, 1),`
    );
  }

  if (!content.includes("expiresAt: firstExpiresAt,\n      lateFeeType,")) {
    content = content.replace(
      `      amount: firstAmount,\n      dueDate: firstChargeDate,\n      status: "PENDING",`,
      `      amount: firstAmount,\n      dueDate: firstChargeDate,\n      expiresAt: firstExpiresAt,\n      lateFeeType,\n      lateFeeValue,\n      lateFeeApplied: false,\n      status: "PENDING",`
    );
  }

  if (!content.includes("description: input.description,\n    expiresAt: firstExpiresAt,")) {
    content = content.replace(
      `    description: input.description,\n  });`,
      `    description: input.description,\n    expiresAt: firstExpiresAt,\n  });`
    );
  }

  if (!content.includes("expiresAt: firstExpiresAt,\n        lateFeeType,")) {
    content = content.replace(
      `        mercadoPagoPaymentId: preference.providerPreferenceId,\n        mercadoPagoInitPoint: paymentUrl,`,
      `        mercadoPagoPaymentId: preference.providerPreferenceId,\n        mercadoPagoInitPoint: paymentUrl,\n        expiresAt: firstExpiresAt,\n        lateFeeType,\n        lateFeeValue,`
    );
  }

  if (!content.includes("originalAmount: new Prisma.Decimal(firstAmount),")) {
    content = content.replace(
      `      amount: new Prisma.Decimal(firstAmount),\n      dueDate: firstChargeDate,`,
      `      amount: new Prisma.Decimal(firstAmount),\n      originalAmount: new Prisma.Decimal(firstAmount),\n      currentAmount: new Prisma.Decimal(firstAmount),\n      dueDate: firstChargeDate,\n      paymentValidityDays,\n      expiresAt: firstExpiresAt,`
    );
  }

  if (!content.includes("lateFeeType,\n      lateFeeValue,\n      lateFeeApplied: false,")) {
    content = content.replace(
      `      sandboxInitPoint: preference.sandboxInitPoint,\n      emailTarget: client.email ?? null,`,
      `      sandboxInitPoint: preference.sandboxInitPoint,\n      lateFeeType,\n      lateFeeValue,\n      lateFeeApplied: false,\n      emailTarget: client.email ?? null,`
    );
  }

  return content;
});

patch("src/services/recurring-charge-processor.service.ts", "processor validade", (content) => {
  if (!content.includes("function calculateExpiresAt")) {
    content = content.replace(
      `function normalizePhone(phone?: string | null) {\n  if (!phone) return null;\n  const digits = phone.replace(/\\D/g, "");\n  return digits || null;\n}\n`,
      `function normalizePhone(phone?: string | null) {\n  if (!phone) return null;\n  const digits = phone.replace(/\\D/g, "");\n  return digits || null;\n}\n\nfunction normalizePaymentValidityDays(value?: number | null) {\n  const numeric = Number(value ?? 3);\n\n  if (!Number.isFinite(numeric) || numeric <= 0) {\n    return 3;\n  }\n\n  return Math.max(1, Math.floor(numeric));\n}\n\nfunction normalizeLateFeeType(value?: string | null) {\n  return value === "PERCENT" || value === "FIXED" ? value : "NONE";\n}\n\nfunction normalizeLateFeeValue(type: string, value?: number | null) {\n  if (type === "NONE") return null;\n\n  const numeric = Number(value ?? 0);\n  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;\n}\n\nfunction calculateExpiresAt(baseDate: Date, paymentValidityDays: number) {\n  const expiresAt = new Date(baseDate);\n  expiresAt.setDate(expiresAt.getDate() + paymentValidityDays);\n  expiresAt.setHours(23, 59, 59, 999);\n  return expiresAt;\n}\n`
    );
  }

  if (!content.includes("const paymentValidityDays = normalizePaymentValidityDays(recurring.paymentValidityDays);")) {
    content = content.replace(
      `    const dueDate = recurring.nextChargeDate;\n\n    const createdInstallment = await prisma.recurringChargeInstallment.create({`,
      `    const dueDate = recurring.nextChargeDate;\n    const paymentValidityDays = normalizePaymentValidityDays(recurring.paymentValidityDays);\n    const lateFeeType = normalizeLateFeeType(recurring.lateFeeType);\n    const lateFeeValue = normalizeLateFeeValue(lateFeeType, recurring.lateFeeValue);\n    const expiresAt = calculateExpiresAt(dueDate, paymentValidityDays);\n\n    const createdInstallment = await prisma.recurringChargeInstallment.create({`
    );
  }

  if (!content.includes("expiresAt,\n        lateFeeType,")) {
    content = content.replace(
      `        amount,\n        dueDate,\n        status: "PENDING",`,
      `        amount,\n        dueDate,\n        expiresAt,\n        lateFeeType,\n        lateFeeValue,\n        lateFeeApplied: false,\n        status: "PENDING",`
    );
  }

  if (!content.includes("description: recurring.description,\n      expiresAt,")) {
    content = content.replace(
      `      description: recurring.description,\n    });`,
      `      description: recurring.description,\n      expiresAt,\n    });`
    );
  }

  if (!content.includes("expiresAt,\n        lateFeeType,\n        lateFeeValue,")) {
    content = content.replace(
      `        mercadoPagoPaymentId: preference.providerPreferenceId,\n        mercadoPagoInitPoint: paymentUrl,`,
      `        mercadoPagoPaymentId: preference.providerPreferenceId,\n        mercadoPagoInitPoint: paymentUrl,\n        expiresAt,\n        lateFeeType,\n        lateFeeValue,`
    );
  }

  if (!content.includes("originalAmount: new Prisma.Decimal(amount),")) {
    content = content.replace(
      `        amount: new Prisma.Decimal(amount),\n        dueDate: dueDate,`,
      `        amount: new Prisma.Decimal(amount),\n        originalAmount: new Prisma.Decimal(amount),\n        currentAmount: new Prisma.Decimal(amount),\n        dueDate: dueDate,\n        paymentValidityDays,\n        expiresAt,`
    );
  }

  if (!content.includes("lateFeeApplied: false,\n        emailTarget: recurring.client.email")) {
    content = content.replace(
      `        sandboxInitPoint: preference.sandboxInitPoint,\n        emailTarget: recurring.client.email ?? null,`,
      `        sandboxInitPoint: preference.sandboxInitPoint,\n        lateFeeType,\n        lateFeeValue,\n        lateFeeApplied: false,\n        emailTarget: recurring.client.email ?? null,`
    );
  }

  return content;
});

patch("src/app/api/admin/charges/recurring/route.ts", "route recurring novos campos", (content) => {
  if (!content.includes("paymentValidityDays:")) {
    content = content.replace(
      `      interestStartsAtInstallment: body.interestStartsAtInstallment != null\n        ? Number(body.interestStartsAtInstallment)\n        : null,\n    });`,
      `      interestStartsAtInstallment: body.interestStartsAtInstallment != null\n        ? Number(body.interestStartsAtInstallment)\n        : null,\n      paymentValidityDays: body.paymentValidityDays != null\n        ? Number(body.paymentValidityDays)\n        : 3,\n      lateFeeType: typeof body.lateFeeType === "string"\n        ? body.lateFeeType\n        : "NONE",\n      lateFeeValue: body.lateFeeValue != null\n        ? Number(body.lateFeeValue)\n        : null,\n    });`
    );
  }

  return content;
});

console.log("");
console.log("Fase 2 patches aplicados.");
