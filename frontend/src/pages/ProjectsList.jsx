import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { PROJECT_STATUS, PRIORITY, colorFor, formatDate } from "../lib/ui";

export default function ProjectsList() {
  const { departmentId, currentDepartment } = useAuth();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const isGestor = currentDepartment?.role === "GESTOR";

  function load() {
    if (!departmentId) return;
    setLoading(true);
    Promise.all([api.listProjects({ departmentId }), api.listTasks({ departmentId })])
      .then(([p, t]) => {
        setProjects(p);
        setTasks(t);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [departmentId]);

  const progressByProject = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (!t.projectId) continue;
      if (!map[t.projectId]) map[t.projectId] = { total: 0, done: 0 };
      map[t.projectId].total += 1;
      if (t.status === "DONE") map[t.projectId].done += 1;
    }
    return map;
  }, [tasks]);

  const stats = useMemo(() => {
    const s = { total: projects.length, EM_ANDAMENTO: 0, CONCLUIDO: 0, BLOQUEADO: 0 };
    for (const p of projects) if (s[p.status] !== undefined) s[p.status] += 1;
    return s;
  }, [projects]);

  const filtered = statusFilter ? projects.filter((p) => p.status === statusFilter) : projects;

  async function handleCreate(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    await api.createProject({
      departmentId,
      titulo: form.get("titulo"),
      descricao: form.get("descricao"),
      prioridade: form.get("prioridade"),
      prazo: form.get("prazo") || null,
    });
    setShowForm(false);
    load();
  }

  if (!departmentId) {
    return <div className="empty-state">Você ainda não está vinculado a nenhum departamento.</div>;
  }

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1>Projetos</h1>
          <div className="sub">{currentDepartment?.nome}</div>
        </div>
        {isGestor && (
          <button className="btn pri" onClick={() => setShowForm(true)}>
            + Novo projeto
          </button>
        )}
      </div>

      <div className="grid4" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card sc-total">
          <div className="sc-icon">📁</div>
          <div className="sc-val">{stats.total}</div>
          <div className="sc-lbl">Total</div>
        </div>
        <div className="stat-card sc-prog">
          <div className="sc-icon">🚀</div>
          <div className="sc-val">{stats.EM_ANDAMENTO}</div>
          <div className="sc-lbl">Em andamento</div>
        </div>
        <div className="stat-card sc-done">
          <div className="sc-icon">✅</div>
          <div className="sc-val">{stats.CONCLUIDO}</div>
          <div className="sc-lbl">Concluídos</div>
        </div>
        <div className="stat-card sc-block">
          <div className="sc-icon">⛔</div>
          <div className="sc-val">{stats.BLOQUEADO}</div>
          <div className="sc-lbl">Bloqueados</div>
        </div>
      </div>

      <div className="filter-row">
        <select className="select pill" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(PROJECT_STATUS).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">Nenhum projeto neste departamento ainda.</div>
      ) : (
        <div className="pgrid">
          {filtered.map((p) => {
            const prog = progressByProject[p.id];
            const total = prog?.total ?? p._count?.tasks ?? 0;
            const done = prog?.done ?? 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const statusInfo = PROJECT_STATUS[p.status] || {};
            const priorityInfo = PRIORITY[p.prioridade] || {};
            return (
              <Link key={p.id} to={`/projetos/${p.id}`} className="acard">
                <div className="acard-top">
                  <span className="adot" style={{ background: colorFor(p.id) }} />
                  <span className="astage">{statusInfo.label}</span>
                  {priorityInfo.label && <span className={`badge ${priorityInfo.badge}`}>{priorityInfo.label}</span>}
                </div>
                <div className="acard-title">{p.titulo}</div>
                <div className="acard-meta">
                  {p.responsavel?.name || "Sem responsável"}
                  {p.prazo ? ` · até ${formatDate(p.prazo)}` : ""}
                </div>
                <div className="acard-prog">
                  <div className="apbar">
                    <div className="apfill" style={{ width: `${pct}%`, background: colorFor(p.id) }} />
                  </div>
                  <div className="apct">{total > 0 ? `${done}/${total}` : "—"}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Novo projeto</h2>
            <form onSubmit={handleCreate}>
              <div className="fg">
                <label className="inp-lbl">Título</label>
                <input name="titulo" className="inp" required autoFocus />
              </div>
              <div className="fg">
                <label className="inp-lbl">Descrição</label>
                <textarea name="descricao" className="inp" rows={3} />
              </div>
              <div className="grid2">
                <div className="fg">
                  <label className="inp-lbl">Prioridade</label>
                  <select name="prioridade" className="inp" defaultValue="MEDIA">
                    {Object.entries(PRIORITY).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="inp-lbl">Prazo</label>
                  <input name="prazo" type="date" className="inp" />
                </div>
              </div>
              <div className="mfooter">
                <button type="button" className="btn" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn pri">
                  Criar projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
