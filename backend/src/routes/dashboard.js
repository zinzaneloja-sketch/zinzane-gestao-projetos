const express = require("express");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { visibleDepartmentIds } = require("../lib/access");

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/desempenho?departmentId=...
// Painel de desempenho da equipe: por pessoa (concluídas/pendentes/
// atrasadas) e por departamento (cumprimento de prazo, progresso dos
// projetos). Respeita a mesma visibilidade de departamentos usada no
// resto do sistema — admin vê a empresa toda, os demais só o que já
// podem ver hoje (mais qualquer tarefa da qual sejam responsáveis).
router.get("/desempenho", async (req, res) => {
  const { departmentId } = req.query;
  const allowed = await visibleDepartmentIds(req.user); // null = admin, vê tudo

  if (departmentId && allowed !== null && !allowed.includes(departmentId)) {
    return res.status(403).json({ error: "Você não tem acesso a este departamento." });
  }

  const deptScope = departmentId ? { departmentId } : allowed !== null ? { departmentId: { in: allowed } } : {};

  const [tasks, projects, departments] = await Promise.all([
    prisma.task.findMany({
      where: deptScope,
      select: {
        id: true,
        status: true,
        prazo: true,
        concluidaEm: true,
        departmentId: true,
        assignees: { select: { userId: true, user: { select: { id: true, name: true, cargo: true, color: true } } } },
      },
    }),
    prisma.project.findMany({
      where: deptScope,
      select: { id: true, status: true, prazo: true, departmentId: true },
    }),
    prisma.department.findMany({
      where: departmentId ? { id: departmentId } : allowed !== null ? { id: { in: allowed } } : {},
      select: { id: true, nome: true, cor: true },
    }),
  ]);

  const now = new Date();
  const isTaskOverdue = (t) => t.status !== "DONE" && t.prazo && new Date(t.prazo) < now;

  // ── Por pessoa ──
  const porPessoaMap = new Map();
  for (const t of tasks) {
    const overdue = isTaskOverdue(t);
    for (const a of t.assignees) {
      if (!porPessoaMap.has(a.userId)) {
        porPessoaMap.set(a.userId, {
          userId: a.userId,
          name: a.user.name,
          cargo: a.user.cargo,
          color: a.user.color,
          concluidas: 0,
          pendentes: 0,
          atrasadas: 0,
          total: 0,
        });
      }
      const p = porPessoaMap.get(a.userId);
      p.total += 1;
      if (t.status === "DONE") p.concluidas += 1;
      else if (overdue) p.atrasadas += 1;
      else p.pendentes += 1;
    }
  }
  const porPessoa = [...porPessoaMap.values()].sort((a, b) => b.total - a.total);

  // ── Por departamento ──
  function blankDept(d) {
    return {
      departmentId: d.id,
      nome: d.nome,
      cor: d.cor,
      tarefasTotal: 0,
      tarefasConcluidas: 0,
      tarefasConcluidasNoPrazo: 0,
      tarefasAbertasAtrasadas: 0,
      projetosTotal: 0,
      projetosConcluidos: 0,
      projetosEmAndamento: 0,
      projetosBloqueados: 0,
      projetosAtrasados: 0,
    };
  }
  const porDepartamentoMap = new Map(departments.map((d) => [d.id, blankDept(d)]));
  function ensureDept(id) {
    if (!porDepartamentoMap.has(id)) porDepartamentoMap.set(id, blankDept({ id, nome: "—", cor: null }));
    return porDepartamentoMap.get(id);
  }

  for (const t of tasks) {
    const d = ensureDept(t.departmentId);
    d.tarefasTotal += 1;
    if (t.status === "DONE") {
      d.tarefasConcluidas += 1;
      const noPrazo = !t.prazo || (t.concluidaEm && new Date(t.concluidaEm) <= new Date(t.prazo));
      if (noPrazo) d.tarefasConcluidasNoPrazo += 1;
    } else if (isTaskOverdue(t)) {
      d.tarefasAbertasAtrasadas += 1;
    }
  }

  for (const p of projects) {
    const d = ensureDept(p.departmentId);
    d.projetosTotal += 1;
    if (p.status === "CONCLUIDO") d.projetosConcluidos += 1;
    else if (p.status === "EM_ANDAMENTO") d.projetosEmAndamento += 1;
    else if (p.status === "BLOQUEADO") d.projetosBloqueados += 1;
    if (p.status !== "CONCLUIDO" && p.prazo && new Date(p.prazo) < now) d.projetosAtrasados += 1;
  }

  const porDepartamento = [...porDepartamentoMap.values()]
    .map((d) => ({
      ...d,
      taxaNoPrazo: d.tarefasConcluidas > 0 ? Math.round((d.tarefasConcluidasNoPrazo / d.tarefasConcluidas) * 100) : null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  res.json({
    totais: {
      tarefas: tasks.length,
      tarefasConcluidas: tasks.filter((t) => t.status === "DONE").length,
      tarefasAtrasadas: tasks.filter(isTaskOverdue).length,
      projetos: projects.length,
      projetosConcluidos: projects.filter((p) => p.status === "CONCLUIDO").length,
    },
    porPessoa,
    porDepartamento,
  });
});

module.exports = router;
