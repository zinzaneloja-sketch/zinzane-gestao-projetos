const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { canAccessDepartment, isDepartmentManager, visibleDepartmentIds } = require("../lib/access");

const router = express.Router();
router.use(requireAuth);

const VALID_STATUS = ["TODO", "DOING", "REVIEW", "DONE", "BLOCKED"];

// GET /api/tasks?departmentId=&projeto=&membro=&prioridade=&minhas=1
router.get("/", async (req, res) => {
  const { departmentId, projeto, membro, prioridade, minhas } = req.query;
  const allowed = await visibleDepartmentIds(req.user);

  if (departmentId && allowed !== null && !allowed.includes(departmentId)) {
    return res.status(403).json({ error: "Você não tem acesso a este departamento." });
  }

  const where = {};
  if (departmentId) where.departmentId = departmentId;
  else if (allowed !== null) where.departmentId = { in: allowed };

  if (projeto) where.projectId = projeto;
  if (prioridade) where.prioridade = prioridade;
  if (membro) where.responsavelId = membro;
  if (minhas === "1") where.responsavelId = req.user.id;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      responsavel: { select: { id: true, name: true } },
      project: { select: { id: true, titulo: true } },
      department: { select: { id: true, nome: true, cor: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(tasks);
});

router.post("/", async (req, res) => {
  const { departmentId, titulo, descricao, projectId, responsavelId, prioridade, prazo, tags } = req.body || {};
  if (!departmentId || !titulo) return res.status(400).json({ error: "Departamento e título são obrigatórios." });
  if (!(await canAccessDepartment(req.user, departmentId))) {
    return res.status(403).json({ error: "Você não tem acesso a este departamento." });
  }

  const task = await prisma.task.create({
    data: {
      departmentId,
      titulo,
      descricao,
      projectId: projectId || null,
      responsavelId: responsavelId || null,
      prioridade: prioridade || "MEDIA",
      prazo: prazo ? new Date(prazo) : null,
      tags: tags || [],
    },
  });
  res.status(201).json(task);
});

// PATCH /api/tasks/:id/status — mover no kanban.
// Regra: o próprio responsável sempre pode mover sua tarefa;
// quem não é responsável precisa ser Gestor do departamento (ou admin).
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!VALID_STATUS.includes(status)) return res.status(400).json({ error: "Status inválido." });

  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada." });

  const isOwner = task.responsavelId === req.user.id;
  if (!isOwner && !(await isDepartmentManager(req.user, task.departmentId))) {
    return res.status(403).json({ error: "Apenas o responsável ou o Gestor do departamento podem alterar esta tarefa." });
  }

  const updated = await prisma.task.update({
    where: { id: req.params.id },
    data: { status, concluidaEm: status === "DONE" ? new Date() : null },
  });
  res.json(updated);
});

router.patch("/:id", async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada." });
  const isOwner = task.responsavelId === req.user.id;
  if (!isOwner && !(await isDepartmentManager(req.user, task.departmentId))) {
    return res.status(403).json({ error: "Sem permissão para editar esta tarefa." });
  }

  const { titulo, descricao, responsavelId, prioridade, prazo, tags } = req.body || {};
  const updated = await prisma.task.update({
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
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!task) return res.status(404).json({ error: "Tarefa não encontrada." });
  if (!(await isDepartmentManager(req.user, task.departmentId))) {
    return res.status(403).json({ error: "Só o Gestor do departamento pode excluir tarefas." });
  }
  await prisma.task.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// ── Apontamento de horas ──
router.post("/:id/time-entries/start", async (req, res) => {
  const entry = await prisma.taskTimeEntry.create({ data: { taskId: req.params.id, inicio: new Date() } });
  res.status(201).json(entry);
});

router.post("/:id/time-entries/:entryId/stop", async (req, res) => {
  const entry = await prisma.taskTimeEntry.findUnique({ where: { id: req.params.entryId } });
  if (!entry || entry.taskId !== req.params.id) return res.status(404).json({ error: "Apontamento não encontrado." });
  const fim = new Date();
  const segundos = Math.max(0, Math.floor((fim.getTime() - entry.inicio.getTime()) / 1000));
  const updated = await prisma.taskTimeEntry.update({ where: { id: entry.id }, data: { fim, segundosAcumulados: segundos } });
  res.json(updated);
});

module.exports = router;
