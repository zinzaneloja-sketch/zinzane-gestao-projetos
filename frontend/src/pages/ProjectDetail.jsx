import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { PROJECT_STATUS, TASK_STATUS, PRIORITY, colorFor, initials, formatDate, isOverdue } from "../lib/ui";

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

  if (!project) return <div className="empty-state">Carregando...</div>;

  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.status === "DONE").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
    <div>
      <Link to="/projetos" className="btn-voltar-fixo">
        ← Todos os projetos
      </Link>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="acard-top">
              <span className="adot" style={{ background: colorFor(project.id) }} />
              {PRIORITY[project.prioridade] && (
                <span className={`badge ${PRIORITY[project.prioridade].badge}`}>{PRIORITY[project.prioridade].label}</span>
              )}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.3px" }}>{project.titulo}</h1>
            {project.descricao && <p style={{ color: "#86868b", fontSize: 13, marginTop: 6, maxWidth: 520 }}>{project.descricao}</p>}
            <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 12, color: "#86868b" }}>
              <span>Responsável: {project.responsavel?.name || "—"}</span>
              {project.prazo && <span>Prazo: {formatDate(project.prazo)}</span>}
            </div>
          </div>
          <select value={project.status} onChange={(e) => handleStatusChange(e.target.value)}>
            {Object.entries(PROJECT_STATUS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="acard-prog" style={{ marginTop: 18 }}>
          <div className="apbar">
            <div className="apfill" style={{ width: `${pct}%`, background: colorFor(project.id) }} />
          </div>
          <div className="apct">
            {done}/{total}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="sec-title">Tarefas</div>

        {project.tasks.length === 0 ? (
          <div className="empty-state">Nenhuma tarefa ainda.</div>
        ) : (
          <table className="itm-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Responsável</th>
                <th>Prazo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {project.tasks.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.titulo}</td>
                  <td>
                    {t.responsavel ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span className="kcard-av" style={{ background: colorFor(t.responsavel.id) }}>
                          {initials(t.responsavel.name)}
                        </span>
                        {t.responsavel.name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {t.prazo ? (
                      <span className={`kcard-due ${isOverdue(t.prazo) && t.status !== "DONE" ? "overdue" : ""}`}>{formatDate(t.prazo)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <select value={t.status} onChange={(e) => handleTaskStatus(t.id, e.target.value)}>
                      {Object.entries(TASK_STATUS).map(([value, { label }]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form onSubmit={handleAddTask} style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          <input name="titulo" placeholder="Nova tarefa" required className="inp" style={{ flex: 2, minWidth: 160 }} />
          <select name="responsavelId" className="inp" style={{ flex: 1, minWidth: 140 }}>
            <option value="">Sem responsável</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select name="prioridade" defaultValue="MEDIA" className="inp" style={{ maxWidth: 120 }}>
            {Object.entries(PRIORITY).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input name="prazo" type="date" className="inp" style={{ maxWidth: 160 }} />
          <button type="submit" className="btn pri">
            Adicionar
          </button>
        </form>
      </div>
    </div>
  );
}
