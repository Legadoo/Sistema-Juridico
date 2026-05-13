const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const expiredCharges = await prisma.charge.findMany({
    where: {
      status: "EXPIRED",
    },
    orderBy: {
      expiredAt: "desc",
    },
    include: {
      client: true,
    },
  });

  console.log("");
  console.log("Total de cobranças expiradas:", expiredCharges.length);

  for (const charge of expiredCharges) {
    const replacement = charge.replacedByChargeId
      ? await prisma.charge.findUnique({
          where: { id: charge.replacedByChargeId },
        })
      : null;

    console.log("");
    console.log({
      expiredChargeId: charge.id,
      client: charge.client?.name,
      status: charge.status,
      amount: charge.amount?.toString(),
      currentAmount: charge.currentAmount?.toString(),
      expiredAt: charge.expiredAt,
      replacedByChargeId: charge.replacedByChargeId,
      replacementStatus: replacement?.status,
      replacementCurrentAmount: replacement?.currentAmount?.toString(),
      replacementPaidAt: replacement?.paidAt,
      replacementEmailSentAt: replacement?.emailSentAt,
      canSafelyDelete:
        Boolean(charge.replacedByChargeId) &&
        (replacement?.status === "PAID" || replacement?.status === "CANCELED"),
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
