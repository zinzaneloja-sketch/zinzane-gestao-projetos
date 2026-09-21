const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function slugify(nome) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// GET /api/departments — só os departamentos do usuário (admin vê todos)
router.get("/", async (req, res) => {
  const departments = await prisma.department.findMany({
    where: req.user.isAdmin ? {} : { members: { some: { userId: req.user.id } } },
    orderBy: { nome: "asc" },
  });
  res.json(departments);
});

router.post("/", requireAdmin, async (req, res) => {
  const { nome, cor } = req.body || {};
  if (!nome) return res.status(400).json({ error: "Nome é obrigatório." });
  const department = await prisma.department.create({
    data: { nome, cor, slug: slugify(nome) },
  });
  res.status(201).json(department);
});

// GET /api/departments/:id/members
router.get("/:id/members", async (req, res) => {
  const members = await prisma.userDepartment.findMany({
    where: { departmentId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, cargo: true, color: true } } },
  });
  res.json(members);
});

// PUT /api/departments/:id/members/:userId — vincula/atualiza papel de alguém no departamento
router.put("/:id/members/:userId", requireAdmin, async (req, res) => {
  const { role } = req.body || {};
  if (!["MEMBRO", "GESTOR"].includes(role)) return res.status(400).json({ error: "Papel inválido." });
  const membership = await prisma.userDepartment.upsert({
    where: { userId_departmentId: { userId: req.params.userId, departmentId: req.params.id } },
    create: { userId: req.params.userId, departmentId: req.params.id, role },
    update: { role },
  });
  res.json(membership);
});

router.delete("/:id/members/:userId", requireAdmin, async (req, res) => {
  await prisma.userDepartment
    .delete({ where: { userId_departmentId: { userId: req.params.userId, departmentId: req.params.id } } })
    .catch(() => null);
  res.status(204).end();
});

module.exports = router;
