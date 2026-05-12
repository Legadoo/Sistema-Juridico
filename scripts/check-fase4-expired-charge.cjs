const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const latestNewCharge = await prisma.charge.findFirst({
    where: {
      previousChargeId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      client: true,
    },
  });

  if (!latestNewCharge) {
    console.log("Nenhuma cobrança nova com previousChargeId encontrada.");
    return;
  }

  const oldCharge = await prisma.charge.findUnique({
    where: {
      id: latestNewCharge.previousChargeId,
    },
  });

  console.log("");
  console.log("=== COBRANCA ANTIGA ===");
  if (!oldCharge) {
    console.log("Cobrança antiga não encontrada.");
  } else {
    console.log("id:", oldCharge.id);
    console.log("status:", oldCharge.status);
    console.log("expiredAt:", oldCharge.expiredAt);
    console.log("replacedByChargeId:", oldCharge.replacedByChargeId);
    console.log("amount:", oldCharge.amount?.toString());
    console.log("currentAmount:", oldCharge.currentAmount?.toString());
    console.log("paymentUrl antigo existe:", Boolean(oldCharge.paymentUrl));
  }

  console.log("");
  console.log("=== COBRANCA NOVA ===");
  console.log("id:", latestNewCharge.id);
  console.log("status:", latestNewCharge.status);
  console.log("previousChargeId:", latestNewCharge.previousChargeId);
  console.log("amount:", latestNewCharge.amount?.toString());
  console.log("originalAmount:", latestNewCharge.originalAmount?.toString());
  console.log("currentAmount:", latestNewCharge.currentAmount?.toString());
  console.log("lateFeeType:", latestNewCharge.lateFeeType);
  console.log("lateFeeValue:", latestNewCharge.lateFeeValue);
  console.log("lateFeeApplied:", latestNewCharge.lateFeeApplied);
  console.log("lateFeeAppliedAt:", latestNewCharge.lateFeeAppliedAt);
  console.log("expiresAt:", latestNewCharge.expiresAt);
  console.log("paymentUrl novo existe:", Boolean(latestNewCharge.paymentUrl));
  console.log("emailSentAt:", latestNewCharge.emailSentAt);
  console.log("cliente:", latestNewCharge.client?.name);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
