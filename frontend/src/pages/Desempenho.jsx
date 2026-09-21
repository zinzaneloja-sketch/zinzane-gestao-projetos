import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colorFor, initials } from "../lib/ui";

// Painel de desempenho da equipe: ritmo por pessoa (concluídas, pendentes,
// atrasadas), cumprimento de prazo por departamento e progresso dos
// projetos por departamento. Por padrão mostra tudo que a pessoa pode ver
// (a empresa toda, no caso de admins) — dá pra filtrar por departamento.
export default function Desempenho() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [scopeDept, setScopeDept] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .getDesempenho({ departmentId: scopeDept || undefined })
      .then(setData)
      .finally(() => setLoading(false));
  }
  useEffect(load, [scopeDept]);
  useEffect(() => {
    api.listDepartments().then(setDepartments);
  }, []);

  if (loading && !data) return <div className="empty-state">Carregando...</div>;
  if (!data) return null;

  const { totais, porPessoa, porDepartamento } = data;

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1>Desempenho</h1>
          <div className="sub">
            {scopeDept ? departments.find((d) => d.id === scopeDept)?.nome : user?.isAdmin ? "Toda a empresa" : "Seus departamentos"}
          </div>
        </div>
        <select className="select pill" value={scopeDept} onChange={(e) => setScopeDept(e.target.value)}>
          <option value="">{user?.isAdmin ? "Toda a empresa" : "Todos os meus departamentos"}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="grid4" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card sc-total">
          <div className="sc-icon">📋</div>
          <div className="sc-val">{totais.tarefas}</div>
          <div className="sc-lbl">Tarefas</div>
        </div>
        <div className="stat-card sc-done">
          <div className="sc-icon">✅</div>
          <div className="sc-val">{totais.tarefasConcluidas}</div>
          <div className="sc-lbl">Concluídas</div>
        </div>
        <div className="stat-card sc-block">
          <div className="sc-icon">⏰</div>
          <div className="sc-val">{totais.tarefasAtrasadas}</div>
          <div className="sc-lbl">Atrasadas</div>
        </div>
        <div className="stat-card sc-prog">
          <div className="sc-icon">📁</div>
          <div className="sc-val">
            {totais.projetosConcluidos}/{totais.projetos}
          </div>
          <div className="sc-lbl">Projetos concluídos</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.25rem" }}>
        <div className="sec-title">Ritmo por pessoa</div>
        {porPessoa.length === 0 ? (
          <div className="empty-state">Nenhuma tarefa atribuída ainda.</div>
        ) : (
          <table className="itm-table">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Concluídas</th>
                <th>Pendentes</th>
                <th>Atrasadas</th>
                <th>Ritmo de conclusão</th>
              </tr>
            </thead>
            <tbody>
              {porPessoa.map((p) => {
                const pct = p.total > 0 ? Math.round((p.concluidas / p.total) * 100) : 0;
                return (
                  <tr key={p.userId}>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span className="kcard-av" style={{ background: colorFor(p.userId) }}>
                          {initials(p.name)}
                        </span>
                        <span>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          {p.cargo && <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{p.cargo}</div>}
                        </span>
                      </span>
                    </td>
                    <td>{p.concluidas}</td>
                    <td>{p.pendentes}</td>
                    <td style={p.atrasadas > 0 ? { color: "var(--danger)", fontWeight: 700 } : undefined}>{p.atrasadas}</td>
                    <td style={{ minWidth: 140 }}>
                      <div className="acard-prog">
                        <div className="apbar">
                          <div className="apfill" style={{ width: `${pct}%`, background: colorFor(p.userId) }} />
                        </div>
                        <div className="apct">{pct}%</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="sec-title">Por departamento</div>
        {porDepartamento.length === 0 ? (
          <div className="empty-state">Nenhum departamento visível.</div>
        ) : (
          <table className="itm-table">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Cumprimento de prazo</th>
                <th>Tarefas em aberto atrasadas</th>
                <th>Projetos</th>
              </tr>
            </thead>
            <tbody>
              {porDepartamento.map((d) => (
                <tr key={d.departmentId}>
                  <td>
                    <span className="dept-chip">
                      <span className="dept-chip-dot" style={{ background: d.cor || colorFor(d.departmentId) }} />
                      {d.nome}
                    </span>
                  </td>
                  <td style={{ minWidth: 160 }}>
                    {d.taxaNoPrazo === null ? (
                      <span style={{ color: "var(--text-tertiary)" }}>Sem tarefas concluídas</span>
                    ) : (
                      <div className="acard-prog">
                        <div className="apbar">
                          <div
                            className="apfill"
                            style={{ width: `${d.taxaNoPrazo}%`, background: d.taxaNoPrazo >= 70 ? "#34c759" : d.taxaNoPrazo >= 40 ? "#ff9500" : "#ff3b30" }}
                          />
                        </div>
                        <div className="apct">{d.taxaNoPrazo}%</div>
                      </div>
                    )}
                  </td>
                  <td style={d.tarefasAbertasAtrasadas > 0 ? { color: "var(--danger)", fontWeight: 700 } : undefined}>
                    {d.tarefasAbertasAtrasadas}
                  </td>
                  <td>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className="badge done">{d.projetosConcluidos} concluídos</span>
                      <span className="badge prog">{d.projetosEmAndamento} em andamento</span>
                      {d.projetosBloqueados > 0 && <span className="badge block">{d.projetosBloqueados} bloqueados</span>}
                      {d.projetosAtrasados > 0 && <span className="badge alta">{d.projetosAtrasados} atrasados</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
