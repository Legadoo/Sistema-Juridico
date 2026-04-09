import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const firm = await prisma.lawFirm.upsert({
    where: { slug: "advocacia-padrao" },
    update: {},
    create: {
      name: "Advocacia Padrão",
      slug: "advocacia-padrao",
      active: true,
    },
  });

  await prisma.firmConfig.upsert({
    where: { firmId: firm.id },
    update: {},
    create: {
      firmId: firm.id,
      maxClients: 50,
    },
  });

  const usersUpdated = await prisma.$executeRawUnsafe(
    `UPDATE "User" SET "firmId" = ? WHERE "firmId" IS NULL`,
    firm.id
  );

  const clientsUpdated = await prisma.$executeRawUnsafe(
    `UPDATE "Client" SET "firmId" = ? WHERE "firmId" IS NULL`,
    firm.id
  );

  const processesUpdated = await prisma.$executeRawUnsafe(
    `UPDATE "LegalProcess" SET "firmId" = ? WHERE "firmId" IS NULL`,
    firm.id
  );

  console.log("LawFirm padrão criada/garantida:");
  console.log(`- id: ${firm.id}`);
  console.log(`- name: ${firm.name}`);
  console.log(`- slug: ${firm.slug}`);
  console.log("");
  console.log("Backfill concluído:");
  console.log(`- Users atualizados: ${usersUpdated}`);
  console.log(`- Clients atualizados: ${clientsUpdated}`);
  console.log(`- Processes atualizados: ${processesUpdated}`);
}

main()
  .catch((error) => {
    console.error("Erro no backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });