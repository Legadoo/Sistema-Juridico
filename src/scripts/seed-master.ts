import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@demo.com";
  const password = "admin123";
  const name = "Advogado Master";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Master já existe:", email);
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      role: "MASTER",
      active: true,
    },
  });

  console.log("Master criado!");
  console.log("Login:", email);
  console.log("Senha:", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
