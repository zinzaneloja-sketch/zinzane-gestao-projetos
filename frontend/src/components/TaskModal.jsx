import { useState } from "react";
import { api } from "../api/client";
import { TASK_STATUS, PRIORITY, colorFor, initials } from "../lib/ui";

// Modal de detalhe/edição de uma tarefa — abre ao clicar num card do kanban
// ou numa linha da tabela de tarefas de um projeto. Usa PATCH /api/tasks/:id
// (edição de campos) e PATCH /api/tasks/:id/status (mudança de status) já
// existentes no backend.
export default function TaskModal({ task, members, canDelete, onClose, onSaved, onDeleted }) {
  const [titulo, setTitulo] = useState(task.titulo || "");
  const [descricao, setDescricao] = useState(task.descricao || "");
  const [responsavelId, setResponsavelId] = useState(task.responsavelId || "");
  const [prioridade, setPrioridade] = useState(task.prioridade || "MEDIA");
  const [status, setStatus] = useState(task.status || "TODO");
  const [prazo, setPrazo] = useState(task.prazo ? task.prazo.slice(0, 10) : "");
  const [tagsText, setTagsText] = useState((task.tags || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (status !== task.status) {
        await api.updateTaskStatus(task.id, status);
      }
      const updated = await api.updateTask(task.id, {
        titulo,
        descricao,
        responsavelId: responsavelId || null,
        prioridade,
        prazo: prazo || null,
        tags,
      });
      onSaved({ ...updated, status });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir a tarefa "${task.titulo}"? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    setError("");
    try {
      await api.deleteTask(task.id);
      onDeleted(task.id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Editar tarefa</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {error && <div className="login-err">{error}</div>}

        <form onSubmit={handleSave}>
          <div className="fg">
            <label className="inp-lbl">Título</label>
            <input className="inp" value={titulo} onChange={(e) => setTitulo(e.target.value)} required autoFocus />
          </div>

          <div className="grid2">
            <div className="fg">
              <label className="inp-lbl">Responsável</label>
              <select className="select" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
                <option value="">Sem responsável</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="inp-lbl">Prazo</label>
              <input type="date" className="inp" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>

          <div className="grid2">
            <div className="fg">
              <label className="inp-lbl">Prioridade</label>
              <select className="select" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                {Object.entries(PRIORITY).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="inp-lbl">Status</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(TASK_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fg">
            <label className="inp-lbl">Observações / descrição</label>
            <textarea
              className="inp"
              rows={5}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Objetivo, contexto, links, notas de acompanhamento..."
            />
          </div>

          <div className="fg">
            <label className="inp-lbl">Tags (separadas por vírgula)</label>
            <input className="inp" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="ex.: Marketing, Quick wins" />
          </div>

          {task.responsavel && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 4 }}>
              <span className="kcard-av" style={{ background: colorFor(task.responsavel.id) }}>
                {initials(task.responsavel.name)}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Responsável atual: {task.responsavel.name}</span>
            </div>
          )}

          <div className="mfooter">
            {canDelete && (
              <button type="button" className="btn danger" onClick={handleDelete} disabled={deleting || saving}>
                {deleting ? "Excluindo..." : "Excluir tarefa"}
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose} disabled={saving || deleting}>
              Cancelar
            </button>
            <button type="submit" className="btn pri" disabled={saving || deleting}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
