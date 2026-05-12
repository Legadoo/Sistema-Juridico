const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function calculateExpiresAt(baseDate, days) {
  const expiresAt = new Date(baseDate);
  expiresAt.setDate(expiresAt.getDate() + days);
  expiresAt.setHours(23, 59, 59, 999);
  return expiresAt;
}

async function main() {
  const installments = await prisma.recurringChargeInstallment.findMany({
    where: {
      status: "PENDING",
      expiresAt: null,
    },
    include: {
      recurringCharge: true,
    },
  });

  let installmentsUpdated = 0;

  for (const installment of installments) {
    const days = installment.recurringCharge?.paymentValidityDays || 3;
    const expiresAt = calculateExpiresAt(installment.dueDate, days);

    await prisma.recurringChargeInstallment.update({
      where: { id: installment.id },
      data: {
        expiresAt,
        lateFeeType: installment.lateFeeType || installment.recurringCharge?.lateFeeType || "NONE",
        lateFeeValue:
          installment.lateFeeValue ??
          installment.recurringCharge?.lateFeeValue ??
          null,
      },
    });

    await prisma.charge.updateMany({
      where: {
        externalReference: installment.id,
        status: "PENDING",
        expiresAt: null,
      },
      data: {
        paymentValidityDays: days,
        expiresAt,
        originalAmount: installment.amount,
        currentAmount: installment.amount,
        lateFeeType: installment.recurringCharge?.lateFeeType || "NONE",
        lateFeeValue: installment.recurringCharge?.lateFeeValue ?? null,
        lateFeeApplied: false,
      },
    });

    installmentsUpdated++;
  }

  const charges = await prisma.charge.findMany({
    where: {
      status: "PENDING",
      expiresAt: null,
      dueDate: {
        not: null,
      },
    },
  });

  let chargesUpdated = 0;

  for (const charge of charges) {
    const days = charge.paymentValidityDays || 3;
    const expiresAt = calculateExpiresAt(charge.dueDate, days);

    await prisma.charge.update({
      where: { id: charge.id },
      data: {
        paymentValidityDays: days,
        expiresAt,
        originalAmount: charge.originalAmount ?? charge.amount,
        currentAmount: charge.currentAmount ?? charge.amount,
        lateFeeType: charge.lateFeeType || "NONE",
        lateFeeApplied: charge.lateFeeApplied ?? false,
      },
    });

    chargesUpdated++;
  }

  console.log("Installments atualizadas:", installmentsUpdated);
  console.log("Charges atualizadas:", chargesUpdated);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
