const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const installment = await prisma.recurringChargeInstallment.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      recurringCharge: true,
    },
  });

  if (!installment) {
    console.log("Nenhuma RecurringChargeInstallment encontrada.");
    return;
  }

  const charge = await prisma.charge.findFirst({
    where: {
      externalReference: installment.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log("");
  console.log("=== ULTIMA PARCELA RECORRENTE ===");
  console.log("id:", installment.id);
  console.log("status:", installment.status);
  console.log("dueDate:", installment.dueDate);
  console.log("expiresAt:", installment.expiresAt);
  console.log("lateFeeType:", installment.lateFeeType);
  console.log("lateFeeValue:", installment.lateFeeValue);

  console.log("");
  console.log("=== RECORRENCIA ===");
  console.log("id:", installment.recurringCharge.id);
  console.log("paymentValidityDays:", installment.recurringCharge.paymentValidityDays);
  console.log("lateFeeType:", installment.recurringCharge.lateFeeType);
  console.log("lateFeeValue:", installment.recurringCharge.lateFeeValue);

  console.log("");
  console.log("=== CHARGE VINCULADA ===");

  if (!charge) {
    console.log("Nenhuma Charge encontrada com externalReference igual ao id da parcela.");
    return;
  }

  console.log("id:", charge.id);
  console.log("status:", charge.status);
  console.log("dueDate:", charge.dueDate);
  console.log("expiresAt:", charge.expiresAt);
  console.log("paymentValidityDays:", charge.paymentValidityDays);
  console.log("originalAmount:", charge.originalAmount?.toString());
  console.log("currentAmount:", charge.currentAmount?.toString());
  console.log("lateFeeType:", charge.lateFeeType);
  console.log("lateFeeValue:", charge.lateFeeValue);
  console.log("paymentUrl preenchido:", Boolean(charge.paymentUrl));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
