import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

const STATUS_LABEL = { NAO_INICIADO: "Não iniciado", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", BLOQUEADO: "Bloqueado" };
const TASK_STATUS_LABEL = { TODO: "A fazer", DOING: "Em andamento", REVIEW: "Em revisão", DONE: "Concluído", BLOCKED: "Bloqueado" };

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);

  function load() {
    api.getProject(id).then((p) => {
      setProject(p);
      api.listUsers(p.departmentId).then(setMembers);
    });
  }
  useEffect(load, [id]);

  if (!project) return <div style={{ padding: "2rem" }}>Carregando...</div>;

  async function handleStatusChange(status) {
    await api.updateProject(id, { status });
    load();
  }

  async function handleAddTask(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    await api.createTask({
      departmentId: project.departmentId,
      projectId: id,
      titulo: form.get("titulo"),
      responsavelId: form.get("responsavelId") || null,
      prazo: form.get("prazo") || null,
      prioridade: form.get("prioridade"),
    });
    e.target.reset();
    load();
  }

  async function handleTaskStatus(taskId, status) {
    await api.updateTaskStatus(taskId, status);
    load();
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      <Link to="/projetos" style={{ fontSize: 13, color: "#0071e3" }}>
        ← Todos os projetos
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginTop: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, margin: 0 }}>{project.titulo}</h1>
          <p style={{ color: "#666" }}>{project.descricao}</p>
        </div>
        <select value={project.status} onChange={(e) => handleStatusChange(e.target.value)} style={{ padding: 6 }}>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>Tarefas</h2>
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        {project.tasks.length === 0 && <div style={{ color: "#888", fontSize: 13 }}>Nenhuma tarefa ainda.</div>}
        {project.tasks.map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.titulo}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{t.responsavel?.name || "Sem responsável"}</div>
            </div>
            <select value={t.status} onChange={(e) => handleTaskStatus(t.id, e.target.value)} style={{ fontSize: 12, padding: 4 }}>
              {Object.entries(TASK_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddTask} style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <input name="titulo" placeholder="Nova tarefa" required style={{ padding: 6, flex: 2 }} />
        <select name="responsavelId" style={{ padding: 6, flex: 1 }}>
          <option value="">Sem responsável</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select name="prioridade" defaultValue="MEDIA" style={{ padding: 6 }}>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Média</option>
          <option value="BAIXA">Baixa</option>
        </select>
        <input name="prazo" type="date" style={{ padding: 6 }} />
        <button type="submit" style={{ padding: "6px 12px", background: "#0071e3", color: "#fff", border: "none", borderRadius: 6 }}>
          Adicionar
        </button>
      </form>
    </div>
  );
}
