const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEPARTAMENTOS = [
  "Compras",
  "Estilo",
  "Marketing",
  "Jurídico",
  "Financeiro",
  "Contábil/Fiscal",
  "Departamento Pessoal",
  "Logística",
  "E-commerce",
  "Tecnologia",
  "Expansão",
];

function slugify(nome) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  // 1. Departamentos — idempotente (upsert por nome)
  const departments = [];
  for (const nome of DEPARTAMENTOS) {
    const dep = await prisma.department.upsert({
      where: { nome },
      create: { nome, slug: slugify(nome) },
      update: {},
    });
    departments.push(dep);
  }
  console.log(`Departamentos: ${departments.length} garantidos.`);

  // 2. Usuário admin — vira Gestor de todos os departamentos
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@zinzane.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "troque-esta-senha";

  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: { name: "Administrador", email: adminEmail, passwordHash, isAdmin: true, cargo: "Administrador" },
    });
    console.log(`Usuário admin criado: ${adminEmail} (defina SEED_ADMIN_PASSWORD para escolher a senha).`);
  } else {
    console.log(`Usuário admin ${adminEmail} já existia.`);
  }

  for (const dep of departments) {
    await prisma.userDepartment.upsert({
      where: { userId_departmentId: { userId: admin.id, departmentId: dep.id } },
      create: { userId: admin.id, departmentId: dep.id, role: "GESTOR" },
      update: { role: "GESTOR" },
    });
  }
  console.log("Admin vinculado como Gestor em todos os departamentos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
