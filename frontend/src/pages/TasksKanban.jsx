import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colorFor, initials, formatDate, isOverdue } from "../lib/ui";
import TaskModal from "../components/TaskModal";

const COLUMNS = [
  { id: "TODO", label: "A fazer", colClass: "col-a-fazer" },
  { id: "DOING", label: "Em andamento", colClass: "col-andamento" },
  { id: "REVIEW", label: "Em revisão", colClass: "col-revisao" },
  { id: "DONE", label: "Concluído", colClass: "col-feito" },
  { id: "BLOCKED", label: "Bloqueado", colClass: "col-bloqueado" },
];

export default function TasksKanban() {
  const { departmentId, currentDepartment, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [openTask, setOpenTask] = useState(null);

  const canManage = user?.isAdmin || currentDepartment?.role === "GESTOR";

  function load() {
    if (!departmentId) return;
    api.listTasks({ departmentId }).then(setTasks);
    // Lista da empresa toda — uma tarefa pode ter responsáveis de
    // departamentos diferentes do departamento atual.
    api.listUsers().then(setMembers);
  }
  useEffect(load, [departmentId]);

  async function move(taskId, status) {
    try {
      await api.updateTaskStatus(taskId, status);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  function handleSaved() {
    setOpenTask(null);
    load();
  }

  function handleDeleted() {
    setOpenTask(null);
    load();
  }

  if (!departmentId) {
    return <div className="empty-state">Você ainda não está vinculado a nenhum departamento.</div>;
  }

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1>Tarefas</h1>
          <div className="sub">{currentDepartment?.nome}</div>
        </div>
      </div>

      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`kanban-col ${col.colClass} ${overCol === col.id ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.id);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (dragId) move(dragId, col.id);
              }}
            >
              <div className="kanban-col-header">
                <span className="kanban-col-title">{col.label}</span>
                <span className="kanban-col-count">{colTasks.length}</span>
              </div>
              <div className="kanban-col-cards">
                {colTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`kanban-card ${dragId === t.id ? "dragging" : ""}`}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setOpenTask(t)}
                  >
                    {t.project && <div className="kcard-project">{t.project.titulo}</div>}
                    <div className="kcard-title">{t.titulo}</div>
                    <div className="kcard-meta">
                      {t.assignees && t.assignees.length > 0 && (
                        <span className="avatar-stack">
                          {t.assignees.slice(0, 3).map((a) => (
                            <span key={a.userId} className="kcard-av" style={{ background: colorFor(a.userId) }} title={a.user.name}>
                              {initials(a.user.name)}
                            </span>
                          ))}
                          {t.assignees.length > 3 && (
                            <span className="kcard-av" style={{ background: "var(--surface-muted-strong)", color: "var(--text-secondary)" }}>
                              +{t.assignees.length - 3}
                            </span>
                          )}
                        </span>
                      )}
                      {t.prazo && (
                        <span className={`kcard-due ${isOverdue(t.prazo) && t.status !== "DONE" ? "overdue" : ""}`}>
                          {formatDate(t.prazo)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {openTask && (
        <TaskModal
          task={openTask}
          members={members}
          canDelete={canManage}
          onClose={() => setOpenTask(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
