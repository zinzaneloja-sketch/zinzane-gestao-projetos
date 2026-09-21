import { useEffect, useState } from "react";
import { api } from "../api/client";

const COLUMNS = [
  { id: "TODO", label: "A fazer" },
  { id: "DOING", label: "Em andamento" },
  { id: "REVIEW", label: "Em revisão" },
  { id: "DONE", label: "Concluído" },
  { id: "BLOCKED", label: "Bloqueado" },
];

export default function TeamKanban() {
  const [tasks, setTasks] = useState([]);

  function load() {
    api.listTasks().then(setTasks);
  }
  useEffect(load, []);

  async function move(taskId, status) {
    try {
      await api.updateTaskStatus(taskId, status);
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Kanban do time</h1>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`, gap: 12 }}>
        {COLUMNS.map((col) => (
          <div key={col.id} style={{ background: "#f5f5f7", borderRadius: 12, padding: 12, minHeight: 300 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{col.label}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {tasks
                .filter((t) => t.status === col.id)
                .map((t) => (
                  <div key={t.id} style={{ background: "#fff", borderRadius: 8, padding: 10, boxShadow: "0 1px 2px rgba(0,0,0,.08)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.titulo}</div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      {t.responsavel?.name || "Sem responsável"} {t.project ? `· ${t.project.titulo}` : ""}
                    </div>
                    <select
                      value={t.status}
                      onChange={(e) => move(t.id, e.target.value)}
                      style={{ marginTop: 6, fontSize: 11, padding: 2, width: "100%" }}
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
