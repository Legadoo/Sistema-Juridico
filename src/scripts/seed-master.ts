import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const name = "Master";
  const email = "master@juridicvas.local";
  const password = "123456";
  const role = "MASTER";

  const hash = await bcrypt.hash(password, 10);

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

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hash,
      role,
      active: true,
      firmId: firm.id,
    },
    create: {
      name,
      email,
      password: hash,
      role,
      active: true,
      firmId: firm.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      firmId: true,
    },
  });

  console.log("Master seedado com sucesso:");
  console.log(user);
}

main()
  .catch((error) => {
    console.error("Erro ao seedar master:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });