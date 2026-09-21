const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@zinzane.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "troque-esta-senha";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Usuário admin ${adminEmail} já existe — nada a fazer.`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.create({
    data: {
      name: "Administrador",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      isAdmin: true,
    },
  });

  await prisma.teamMember.create({
    data: { nome: admin.name, email: admin.email, userId: admin.id, cargo: "Administrador" },
  });

  console.log(`Usuário admin criado: ${adminEmail} / senha definida via SEED_ADMIN_PASSWORD (ou padrão de dev).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
