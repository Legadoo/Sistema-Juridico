const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // garante config global do sistema
  await prisma.systemConfig.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", maxClients: 50 },
  });

  const email = "admin@demo.com";
  const password = "admin123";
  const name = "Super Admin";

  const hash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { name, password: hash, role: "SUPERADMIN", active: true },
    });
    console.log("SUPERADMIN atualizado!");
  } else {
    await prisma.user.create({
      data: { name, email, password: hash, role: "SUPERADMIN", active: true },
    });
    console.log("SUPERADMIN criado!");
  }

  console.log("Login:", email);
  console.log("Senha:", password);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

