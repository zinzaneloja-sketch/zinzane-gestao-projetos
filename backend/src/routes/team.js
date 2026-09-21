const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const members = await prisma.teamMember.findMany({ orderBy: { nome: "asc" } });
  res.json(members);
});

router.post("/", requireAdmin, async (req, res) => {
  const { nome, cargo, email, color, disponibilidade, obs, userId } = req.body || {};
  if (!nome) return res.status(400).json({ error: "Nome é obrigatório." });
  const member = await prisma.teamMember.create({
    data: { nome, cargo, email, color, disponibilidade: disponibilidade ?? 100, obs, userId: userId || null },
  });
  res.status(201).json(member);
});

router.patch("/:id", requireAdmin, async (req, res) => {
  const { nome, cargo, email, color, disponibilidade, obs } = req.body || {};
  const member = await prisma.teamMember.update({
    where: { id: req.params.id },
    data: {
      ...(nome !== undefined && { nome }),
      ...(cargo !== undefined && { cargo }),
      ...(email !== undefined && { email }),
      ...(color !== undefined && { color }),
      ...(disponibilidade !== undefined && { disponibilidade }),
      ...(obs !== undefined && { obs }),
    },
  });
  res.json(member);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  await prisma.teamMember.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Salários — só admin visualiza/gerencia (dado sensível)
router.get("/:id/salaries", requireAdmin, async (req, res) => {
  const salaries = await prisma.salary.findMany({
    where: { teamMemberId: req.params.id },
    orderBy: { vigenciaInicio: "desc" },
  });
  res.json(salaries);
});

router.post("/:id/salaries", requireAdmin, async (req, res) => {
  const { valor, vigenciaInicio, vigenciaFim } = req.body || {};
  if (!valor || !vigenciaInicio) return res.status(400).json({ error: "Valor e início de vigência são obrigatórios." });
  const salary = await prisma.salary.create({
    data: {
      teamMemberId: req.params.id,
      valor,
      vigenciaInicio: new Date(vigenciaInicio),
      vigenciaFim: vigenciaFim ? new Date(vigenciaFim) : null,
    },
  });
  res.status(201).json(salary);
});

module.exports = router;
