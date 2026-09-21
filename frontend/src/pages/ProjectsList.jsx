import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const PRIORITY_COLOR = { ALTA: "#ff3b30", MEDIA: "#b25000", BAIXA: "#248a3d" };
const STATUS_LABEL = { NAO_INICIADO: "Não iniciado", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", BLOQUEADO: "Bloqueado" };

export default function ProjectsList() {
  const { departmentId, currentDepartment } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const isGestor = currentDepartment?.role === "GESTOR";

  function load() {
    if (!departmentId) return;
    setLoading(true);
    api
      .listProjects({ departmentId })
      .then(setProjects)
      .finally(() => setLoading(false));
  }

  useEffect(load, [departmentId]);

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
    return <div style={{ padding: "2rem" }}>Você ainda não está vinculado a nenhum departamento.</div>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22 }}>Projetos · {currentDepartment?.nome}</h1>
        {isGestor && (
          <button onClick={() => setShowForm((v) => !v)} style={{ padding: "8px 16px", borderRadius: 8, background: "#0071e3", color: "#fff", border: "none" }}>
            {showForm ? "Cancelar" : "Novo projeto"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ display: "grid", gap: 10, marginBottom: 24, padding: 16, border: "1px solid #eee", borderRadius: 12 }}>
          <input name="titulo" placeholder="Título do projeto" required style={{ padding: 8 }} />
          <textarea name="descricao" placeholder="Descrição" rows={2} style={{ padding: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <select name="prioridade" defaultValue="MEDIA" style={{ padding: 8, flex: 1 }}>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
            <input name="prazo" type="date" style={{ padding: 8, flex: 1 }} />
          </div>
          <button type="submit" style={{ padding: 10, borderRadius: 8, background: "#0071e3", color: "#fff", border: "none" }}>
            Criar
          </button>
        </form>
      )}

      {loading ? (
        <div>Carregando...</div>
      ) : projects.length === 0 ? (
        <div style={{ color: "#888" }}>Nenhum projeto neste departamento ainda.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projetos/${p.id}`}
              style={{ padding: 16, border: "1px solid #eee", borderRadius: 12, textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{p.titulo}</strong>
                <span style={{ color: PRIORITY_COLOR[p.prioridade], fontSize: 12, fontWeight: 600 }}>{p.prioridade}</span>
              </div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                {STATUS_LABEL[p.status]} · Responsável: {p.responsavel?.name || "—"} · {p._count?.tasks || 0} tarefa(s)
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
