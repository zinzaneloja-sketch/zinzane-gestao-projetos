const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { isDepartmentManager } = require("../lib/access");

const router = express.Router();
router.use(requireAuth);

// GET /api/users?departmentId=... — pessoas de um departamento (pra atribuir tarefas/projetos)
router.get("/", async (req, res) => {
  const { departmentId } = req.query;
  const users = await prisma.user.findMany({
    where: departmentId ? { departments: { some: { departmentId } } } : {},
    select: { id: true, name: true, email: true, cargo: true, color: true, isAdmin: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, email, password, cargo, isAdmin } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash, cargo, isAdmin: !!isAdmin } });
  res.status(201).json({ id: user.id, name: user.name, email: user.email });
});

// ── Salários — visível/gerenciável por admin, ou Gestor do Departamento Pessoal ──
async function requireDPManagerOrAdmin(req, res, next) {
  if (req.user.isAdmin) return next();
  const dp = await prisma.department.findUnique({ where: { slug: "departamento-pessoal" } });
  if (dp && (await isDepartmentManager(req.user, dp.id))) return next();
  return res.status(403).json({ error: "Apenas administradores ou o Gestor do Departamento Pessoal podem ver salários." });
}

router.get("/:id/salaries", requireDPManagerOrAdmin, async (req, res) => {
  const salaries = await prisma.salary.findMany({ where: { userId: req.params.id }, orderBy: { vigenciaInicio: "desc" } });
  res.json(salaries);
});

router.post("/:id/salaries", requireDPManagerOrAdmin, async (req, res) => {
  const { valor, vigenciaInicio, vigenciaFim } = req.body || {};
  if (!valor || !vigenciaInicio) return res.status(400).json({ error: "Valor e início de vigência são obrigatórios." });
  const salary = await prisma.salary.create({
    data: { userId: req.params.id, valor, vigenciaInicio: new Date(vigenciaInicio), vigenciaFim: vigenciaFim ? new Date(vigenciaFim) : null },
  });
  res.status(201).json(salary);
});

module.exports = router;
