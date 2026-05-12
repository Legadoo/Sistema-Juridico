const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const charges = await prisma.charge.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      status: true,
      amount: true,
      originalAmount: true,
      currentAmount: true,
      dueDate: true,
      expiresAt: true,
      expiredAt: true,
      previousChargeId: true,
      replacedByChargeId: true,
      lateFeeType: true,
      lateFeeValue: true,
      lateFeeApplied: true,
      paidAt: true,
      emailSentAt: true,
      paymentUrl: true,
    },
  });

  const installments = await prisma.recurringChargeInstallment.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      status: true,
      amount: true,
      dueDate: true,
      expiresAt: true,
      expiredAt: true,
      lateFeeType: true,
      lateFeeValue: true,
      lateFeeAmount: true,
      lateFeeApplied: true,
      paidAt: true,
      mercadoPagoPaymentId: true,
      mercadoPagoInitPoint: true,
    },
  });

  console.log("");
  console.log("=== ULTIMAS 5 CHARGES ===");
  for (const charge of charges) {
    console.log({
      ...charge,
      amount: charge.amount?.toString(),
      originalAmount: charge.originalAmount?.toString(),
      currentAmount: charge.currentAmount?.toString(),
      paymentUrl: Boolean(charge.paymentUrl),
    });
  }

  console.log("");
  console.log("=== ULTIMAS 5 PARCELAS RECORRENTES ===");
  for (const item of installments) {
    console.log({
      ...item,
      mercadoPagoInitPoint: Boolean(item.mercadoPagoInitPoint),
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
