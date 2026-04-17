import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.appointment.deleteMany({
    where: {
      status: {
        in: ["CANCELADO", "CONCLUIDO"]
      }
    }
  });

  console.log(`[purge-appointment-history] Registros removidos: ${result.count}`);
}

main()
  .catch((error) => {
    console.error("[purge-appointment-history] Erro:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });