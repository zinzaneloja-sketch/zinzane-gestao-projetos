const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const MACRO_STAGES = {
  PREPARACAO: ["PLANEJAMENTO", "ESPECIFICACAO"],
  AQUISICAO: ["COMPRA", "RECEBIMENTO"],
  EXECUCAO: ["TAREFAS", "INTEGRACAO"],
  ENCERRAMENTO: ["TESTES", "DOCUMENTACAO", "ENTREGA"],
};

function defaultStages() {
  const stages = [];
  for (const [macro, list] of Object.entries(MACRO_STAGES)) {
    for (const stage of list) stages.push({ macro, stage, status: "PENDENTE" });
  }
  return stages;
}

// GET /api/projects — lista com resumo (sem detalhes pesados)
router.get("/", async (req, res) => {
  const projects = await prisma.project.findMany({
    include: { responsavel: { select: { id: true, name: true } }, stages: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(projects);
});

// GET /api/projects/:id — detalhe completo
router.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      responsavel: { select: { id: true, name: true } },
      stages: true,
      supplies: true,
      labor: true,
      tasks: { include: { responsavel: { select: { id: true, name: true } } } },
      cycles: { include: { checklist: true, links: true } },
    },
  });
  if (!project) return res.status(404).json({ error: "Projeto não encontrado." });
  res.json(project);
});

// POST /api/projects — cria projeto (POC ou Projeto Final) já com as fases padrão
router.post("/", async (req, res) => {
  const { titulo, descricao, responsavelId, prioridade, tipo, continuo, prazo, orcamentoTotal } = req.body || {};
  if (!titulo) return res.status(400).json({ error: "Título é obrigatório." });

  const project = await prisma.project.create({
    data: {
      titulo,
      descricao,
      responsavelId: responsavelId || null,
      prioridade: prioridade || "MEDIA",
      tipo: tipo || "POC",
      continuo: !!continuo,
      prazo: prazo ? new Date(prazo) : null,
      orcamentoTotal: orcamentoTotal ?? null,
      stages: { create: defaultStages() },
    },
    include: { stages: true },
  });
  res.status(201).json(project);
});

router.patch("/:id", async (req, res) => {
  const { titulo, descricao, responsavelId, prioridade, tipo, continuo, prazo, orcamentoTotal } = req.body || {};
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...(titulo !== undefined && { titulo }),
      ...(descricao !== undefined && { descricao }),
      ...(responsavelId !== undefined && { responsavelId }),
      ...(prioridade !== undefined && { prioridade }),
      ...(tipo !== undefined && { tipo }),
      ...(continuo !== undefined && { continuo }),
      ...(prazo !== undefined && { prazo: prazo ? new Date(prazo) : null }),
      ...(orcamentoTotal !== undefined && { orcamentoTotal }),
    },
  });
  res.json(project);
});

router.delete("/:id", async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// PATCH /api/projects/:id/stages/:stageId — atualiza status de uma fase
router.patch("/:id/stages/:stageId", async (req, res) => {
  const { status } = req.body || {};
  if (!["PENDENTE", "EM_ANDAMENTO", "CONCLUIDO", "BLOQUEADO"].includes(status)) {
    return res.status(400).json({ error: "Status inválido." });
  }
  const stage = await prisma.projectStage.update({
    where: { id: req.params.stageId },
    data: { status },
  });
  res.json(stage);
});

// ── Insumos ──
router.post("/:id/supplies", async (req, res) => {
  const { nome, quantidade, unidade, fornecedor, valorUnitario, previsaoEntrega, obs } = req.body || {};
  if (!nome) return res.status(400).json({ error: "Nome do insumo é obrigatório." });
  const supply = await prisma.supply.create({
    data: {
      projectId: req.params.id,
      nome,
      quantidade: quantidade ?? 1,
      unidade: unidade || "un",
      fornecedor,
      valorUnitario: valorUnitario ?? 0,
      previsaoEntrega: previsaoEntrega ? new Date(previsaoEntrega) : null,
      obs,
    },
  });
  res.status(201).json(supply);
});

router.delete("/:id/supplies/:supplyId", async (req, res) => {
  await prisma.supply.delete({ where: { id: req.params.supplyId } });
  res.status(204).end();
});

// ── Mão de obra ──
router.post("/:id/labor", async (req, res) => {
  const { descricao, custo, horas } = req.body || {};
  if (!descricao) return res.status(400).json({ error: "Descrição é obrigatória." });
  const labor = await prisma.labor.create({
    data: { projectId: req.params.id, descricao, custo: custo ?? 0, horas: horas ?? null },
  });
  res.status(201).json(labor);
});

router.delete("/:id/labor/:laborId", async (req, res) => {
  await prisma.labor.delete({ where: { id: req.params.laborId } });
  res.status(204).end();
});

module.exports = router;
