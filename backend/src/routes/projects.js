const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { canAccessDepartment, isDepartmentManager, visibleDepartmentIds } = require("../lib/access");

const router = express.Router();
router.use(requireAuth);

const STATUS_VALUES = ["NAO_INICIADO", "EM_ANDAMENTO", "CONCLUIDO", "BLOQUEADO"];

// GET /api/projects?departmentId=... — lista projetos visíveis ao usuário,
// opcionalmente filtrados por um departamento específico
router.get("/", async (req, res) => {
  const { departmentId } = req.query;
  const allowed = await visibleDepartmentIds(req.user); // null = admin, vê tudo

  if (departmentId) {
    if (allowed !== null && !allowed.includes(departmentId)) {
      return res.status(403).json({ error: "Você não tem acesso a este departamento." });
    }
  }

  const where = {};
  if (departmentId) where.departmentId = departmentId;
  else if (allowed !== null) where.departmentId = { in: allowed };

  const projects = await prisma.project.findMany({
    where,
    include: {
      responsavel: { select: { id: true, name: true } },
      department: { select: { id: true, nome: true, cor: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
});

router.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      responsavel: { select: { id: true, name: true } },
      department: true,
      tasks: { include: { responsavel: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) return res.status(404).json({ error: "Projeto não encontrado." });
  if (!(await canAccessDepartment(req.user, project.departmentId))) {
    return res.status(403).json({ error: "Você não tem acesso ao departamento deste projeto." });
  }
  res.json(project);
});

// POST /api/projects — cria projeto dentro de um departamento
// (só Gestor daquele departamento ou admin)
router.post("/", async (req, res) => {
  const { departmentId, titulo, descricao, responsavelId, prioridade, prazo, orcamentoTotal } = req.body || {};
  if (!departmentId || !titulo) return res.status(400).json({ error: "Departamento e título são obrigatórios." });
  if (!(await isDepartmentManager(req.user, departmentId))) {
    return res.status(403).json({ error: "Só o Gestor do departamento pode criar projetos aqui." });
  }

  const project = await prisma.project.create({
    data: {
      departmentId,
      titulo,
      descricao,
      responsavelId: responsavelId || null,
      prioridade: prioridade || "MEDIA",
      prazo: prazo ? new Date(prazo) : null,
      orcamentoTotal: orcamentoTotal ?? null,
    },
  });
  res.status(201).json(project);
});

router.patch("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Projeto não encontrado." });
  if (!(await isDepartmentManager(req.user, project.departmentId))) {
    return res.status(403).json({ error: "Só o Gestor do departamento pode editar este projeto." });
  }

  const { titulo, descricao, responsavelId, prioridade, status, prazo, orcamentoTotal } = req.body || {};
  if (status && !STATUS_VALUES.includes(status)) return res.status(400).json({ error: "Status inválido." });

  const updated = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...(titulo !== undefined && { titulo }),
      ...(descricao !== undefined && { descricao }),
      ...(responsavelId !== undefined && { responsavelId }),
      ...(prioridade !== undefined && { prioridade }),
      ...(status !== undefined && { status }),
      ...(prazo !== undefined && { prazo: prazo ? new Date(prazo) : null }),
      ...(orcamentoTotal !== undefined && { orcamentoTotal }),
    },
  });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Projeto não encontrado." });
  if (!(await isDepartmentManager(req.user, project.departmentId))) {
    return res.status(403).json({ error: "Só o Gestor do departamento pode excluir este projeto." });
  }
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

module.exports = router;
