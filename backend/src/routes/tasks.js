const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/tasks — kanban unificado (tarefas de projeto + tarefas de time)
// Operador (role OPERADOR) só vê as próprias tarefas — mesma regra do sistema original
router.get("/", async (req, res) => {
  const { projeto, membro, prioridade } = req.query;
  const where = {};
  if (projeto) where.projectId = projeto;
  if (prioridade) where.prioridade = prioridade;

  if (req.user.role === "OPERADOR") {
    where.responsavelId = req.user.id;
  } else if (membro) {
    where.responsavelId = membro;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      responsavel: { select: { id: true, name: true } },
      project: { select: { id: true, titulo: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(tasks);
});

router.post("/", async (req, res) => {
  const { titulo, descricao, projectId, responsavelId, prioridade, prazo, tags } = req.body || {};
  if (!titulo) return res.status(400).json({ error: "Título é obrigatório." });
  const task = await prisma.task.create({
    data: {
      titulo,
      descricao,
      projectId: projectId || null,
      responsavelId: responsavelId || null,
      prioridade: prioridade || "MEDIA",
      prazo: prazo ? new Date(prazo) : null,
      tags: tags || [],
      origem: projectId ? "projeto" : "time",
    },
  });
  res.status(201).json(task);
});

// PATCH /api/tasks/:id/status — mover no kanban (aplica a regra "só o responsável conclui")
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  const valid = ["TODO", "DOING", "REVIEW", "DONE", "BLOCKED"];
  if (!valid.includes(status)) return res.status(400).json({ error: "Status inválido." });

  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada." });

  const isOwner = task.responsavelId === req.user.id;
  if (req.user.role === "OPERADOR" && !isOwner) {
    return res.status(403).json({ error: "Apenas o responsável pela tarefa pode alterá-la." });
  }

  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      status,
      concluidaEm: status === "DONE" ? new Date() : null,
    },
  });
  res.json(updated);
});

router.patch("/:id", async (req, res) => {
  const { titulo, descricao, responsavelId, prioridade, prazo, tags } = req.body || {};
  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...(titulo !== undefined && { titulo }),
      ...(descricao !== undefined && { descricao }),
      ...(responsavelId !== undefined && { responsavelId }),
      ...(prioridade !== undefined && { prioridade }),
      ...(prazo !== undefined && { prazo: prazo ? new Date(prazo) : null }),
      ...(tags !== undefined && { tags }),
    },
  });
  res.json(task);
});

router.delete("/:id", async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ── Apontamento de horas (substitui o "timer" mutável do sistema original) ──
router.post("/:id/time-entries/start", async (req, res) => {
  const entry = await prisma.taskTimeEntry.create({
    data: { taskId: req.params.id, inicio: new Date() },
  });
  res.status(201).json(entry);
});

router.post("/:id/time-entries/:entryId/stop", async (req, res) => {
  const entry = await prisma.taskTimeEntry.findUnique({ where: { id: req.params.entryId } });
  if (!entry || entry.taskId !== req.params.id) return res.status(404).json({ error: "Apontamento não encontrado." });

  const fim = new Date();
  const segundos = Math.max(0, Math.floor((fim.getTime() - entry.inicio.getTime()) / 1000));
  const updated = await prisma.taskTimeEntry.update({
    where: { id: entry.id },
    data: { fim, segundosAcumulados: segundos },
  });
  res.json(updated);
});

module.exports = router;
