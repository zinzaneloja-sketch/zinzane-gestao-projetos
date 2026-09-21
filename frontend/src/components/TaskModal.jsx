import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { TASK_STATUS, PRIORITY, colorFor, initials, formatBytes, formatDate } from "../lib/ui";

// Modal de detalhe/edição de uma tarefa — abre ao clicar num card do kanban
// ou numa linha da tabela de tarefas de um projeto. Usa PATCH /api/tasks/:id
// (edição de campos, incluindo os responsáveis) e PATCH /api/tasks/:id/status
// (mudança de status) já existentes no backend.
//
// Uma tarefa pode ter mais de um responsável, inclusive de departamentos
// diferentes — `members` é a lista de pessoas da empresa toda (não só do
// departamento da tarefa), pra permitir isso.
export default function TaskModal({ task, members, canDelete, onClose, onSaved, onDeleted }) {
  const { user } = useAuth();
  const [titulo, setTitulo] = useState(task.titulo || "");
  const [descricao, setDescricao] = useState(task.descricao || "");
  const [assigneeIds, setAssigneeIds] = useState(
    (task.assignees || []).map((a) => a.userId || a.user?.id).filter(Boolean)
  );
  const [busca, setBusca] = useState("");
  const [prioridade, setPrioridade] = useState(task.prioridade || "MEDIA");
  const [status, setStatus] = useState(task.status || "TODO");
  const [prazo, setPrazo] = useState(task.prazo ? task.prazo.slice(0, 10) : "");
  const [tagsText, setTagsText] = useState((task.tags || []).join(", "));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [attLoading, setAttLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [attError, setAttError] = useState("");

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const selected = assigneeIds.map((id) => membersById.get(id)).filter(Boolean);
  const filtered = members.filter((m) => m.name.toLowerCase().includes(busca.trim().toLowerCase()));

  function toggleAssignee(id) {
    setAssigneeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function loadAttachments() {
    setAttLoading(true);
    api
      .listAttachments(task.id)
      .then(setAttachments)
      .catch((err) => setAttError(err.message))
      .finally(() => setAttLoading(false));
  }
  useEffect(loadAttachments, [task.id]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setAttError("");
    try {
      await api.uploadAttachment(task.id, file);
      loadAttachments();
    } catch (err) {
      setAttError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAttachment(id) {
    if (!confirm("Excluir este anexo? Essa ação não pode ser desfeita.")) return;
    setAttError("");
    try {
      await api.deleteAttachment(id);
      setAttachments((cur) => cur.filter((a) => a.id !== id));
    } catch (err) {
      setAttError(err.message);
    }
  }

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
        responsavelIds: assigneeIds,
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

          <div className="fg">
            <label className="inp-lbl">
              Responsáveis {selected.length > 0 && <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>({selected.length})</span>}
            </label>
            <div className="assignee-chips">
              {selected.length === 0 && <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Ninguém atribuído ainda.</span>}
              {selected.map((m) => (
                <span key={m.id} className="assignee-chip">
                  <span className="kcard-av" style={{ width: 16, height: 16, fontSize: 8, background: colorFor(m.id) }}>
                    {initials(m.name)}
                  </span>
                  {m.name}
                  <button type="button" onClick={() => toggleAssignee(m.id)} aria-label={`Remover ${m.name}`}>
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="assignee-picker">
              <input
                className="assignee-search"
                placeholder="Buscar pessoa por nome (qualquer departamento)..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <div className="assignee-list">
                {filtered.length === 0 ? (
                  <div className="assignee-empty">Ninguém encontrado.</div>
                ) : (
                  filtered.map((m) => {
                    const isSel = assigneeIds.includes(m.id);
                    return (
                      <div key={m.id} className={`assignee-row ${isSel ? "selected" : ""}`} onClick={() => toggleAssignee(m.id)}>
                        <input type="checkbox" checked={isSel} readOnly />
                        <span className="kcard-av" style={{ background: colorFor(m.id) }}>
                          {initials(m.name)}
                        </span>
                        <div className="assignee-row-info">
                          <div className="assignee-row-name">{m.name}</div>
                          {m.cargo && <div className="assignee-row-cargo">{m.cargo}</div>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="grid2">
            <div className="fg">
              <label className="inp-lbl">Prazo</label>
              <input type="date" className="inp" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
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

          <div className="fg">
            <label className="inp-lbl">
              Anexos {attachments.length > 0 && <span style={{ fontWeight: 400, color: "var(--text-tertiary)" }}>({attachments.length})</span>}
            </label>

            {attError && <div className="login-err" style={{ marginBottom: 8 }}>{attError}</div>}

            <div className="attachment-list">
              {attLoading ? (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 4px" }}>Carregando anexos...</div>
              ) : attachments.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 4px" }}>Nenhum arquivo anexado ainda.</div>
              ) : (
                attachments.map((a) => (
                  <div key={a.id} className="attachment-row">
                    <span className="attachment-icon">📎</span>
                    <div className="attachment-info">
                      <button
                        type="button"
                        className="attachment-name"
                        onClick={() => api.downloadAttachment(a.id, a.filename).catch((err) => setAttError(err.message))}
                        title={`Baixar ${a.filename}`}
                      >
                        {a.filename}
                      </button>
                      <div className="attachment-meta">
                        {formatBytes(a.sizeBytes)} · {a.uploadedBy?.name || "Alguém"} · {formatDate(a.createdAt)}
                      </div>
                    </div>
                    {(a.uploadedById === user?.id || canDelete) && (
                      <button type="button" className="aic aic-del" title="Excluir anexo" onClick={() => handleDeleteAttachment(a.id)}>
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <label className="btn attachment-upload-btn" style={{ cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>
              {uploading ? "Enviando..." : "+ Anexar arquivo"}
              <input type="file" style={{ display: "none" }} onChange={handleFileChange} disabled={uploading} />
            </label>
          </div>

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
