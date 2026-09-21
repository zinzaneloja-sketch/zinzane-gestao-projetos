import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

const MACROS = [
  { id: "PREPARACAO", label: "Preparação" },
  { id: "AQUISICAO", label: "Aquisição" },
  { id: "EXECUCAO", label: "Execução" },
  { id: "ENCERRAMENTO", label: "Encerramento" },
];

const STAGE_LABEL = {
  PLANEJAMENTO: "Planejamento",
  ESPECIFICACAO: "Especificação",
  COMPRA: "Compra",
  RECEBIMENTO: "Recebimento",
  TAREFAS: "Tarefas",
  INTEGRACAO: "Integração",
  TESTES: "Testes",
  DOCUMENTACAO: "Documentação",
  ENTREGA: "Entrega",
};

const STATUS_LABEL = { PENDENTE: "Pendente", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", BLOQUEADO: "Bloqueado" };

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);

  function load() {
    api.getProject(id).then(setProject);
  }
  useEffect(load, [id]);

  if (!project) return <div style={{ padding: "2rem" }}>Carregando...</div>;

  async function handleStageChange(stageId, status) {
    await api.updateStage(id, stageId, status);
    load();
  }

  async function handleAddSupply(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    await api.addSupply(id, {
      nome: form.get("nome"),
      quantidade: Number(form.get("quantidade")) || 1,
      unidade: form.get("unidade"),
      fornecedor: form.get("fornecedor"),
      valorUnitario: Number(form.get("valorUnitario")) || 0,
    });
    e.target.reset();
    load();
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
      <Link to="/projetos" style={{ fontSize: 13, color: "#0071e3" }}>
        ← Todos os projetos
      </Link>
      <h1 style={{ fontSize: 22, marginTop: 8 }}>{project.titulo}</h1>
      <p style={{ color: "#666" }}>{project.descricao}</p>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Fases do projeto</h2>
      <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
        {MACROS.map((macro) => (
          <div key={macro.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
            <strong>{macro.label}</strong>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {project.stages
                .filter((s) => s.macro === macro.id)
                .map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{STAGE_LABEL[s.stage]}</span>
                    <select value={s.status} onChange={(e) => handleStageChange(s.id, e.target.value)} style={{ padding: 4 }}>
                      {Object.entries(STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Insumos</h2>
      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        {project.supplies.length === 0 && <div style={{ color: "#888", fontSize: 13 }}>Nenhum insumo cadastrado.</div>}
        {project.supplies.map((s) => (
          <div key={s.id} style={{ fontSize: 13, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", padding: "6px 0" }}>
            <span>
              {s.nome} · {s.quantidade} {s.unidade}
            </span>
            <span>{s.fornecedor || "—"}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddSupply} style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input name="nome" placeholder="Item" required style={{ padding: 6, flex: 2 }} />
        <input name="quantidade" type="number" min="1" defaultValue={1} style={{ padding: 6, width: 60 }} />
        <input name="unidade" placeholder="un" defaultValue="un" style={{ padding: 6, width: 60 }} />
        <input name="fornecedor" placeholder="Fornecedor" style={{ padding: 6, flex: 1 }} />
        <input name="valorUnitario" type="number" step="0.01" placeholder="R$" style={{ padding: 6, width: 90 }} />
        <button type="submit" style={{ padding: "6px 12px", background: "#0071e3", color: "#fff", border: "none", borderRadius: 6 }}>
          Adicionar
        </button>
      </form>
    </div>
  );
}
