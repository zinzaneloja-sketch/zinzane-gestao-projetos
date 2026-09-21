import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colorFor, initials } from "../lib/ui";

const ROLE_LABEL = { GESTOR: "Gestor", MEMBRO: "Membro" };

export default function Team() {
  const { user, departmentId, currentDepartment, refreshUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showNewDept, setShowNewDept] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("MEMBRO");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdmin = !!user?.isAdmin;

  function load() {
    if (!departmentId) return;
    setLoading(true);
    Promise.all([api.listDepartmentMembers(departmentId), isAdmin ? api.listUsers() : Promise.resolve([])])
      .then(([m, u]) => {
        setMembers(m);
        setAllUsers(u);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [departmentId, isAdmin]);

  const availableUsers = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.userId));
    return allUsers.filter((u) => !memberIds.has(u.id));
  }, [allUsers, members]);

  async function handleCreateUser(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.target);
    try {
      const created = await api.createUser({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        cargo: form.get("cargo") || null,
        isAdmin: form.get("isAdmin") === "on",
      });
      // Já vincula a pessoa recém-criada a este departamento
      await api.setDepartmentMember(departmentId, created.id, form.get("role") || "MEMBRO");
      setShowNewUser(false);
      e.target.reset();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddExisting(e) {
    e.preventDefault();
    if (!addUserId) return;
    setError("");
    setBusy(true);
    try {
      await api.setDepartmentMember(departmentId, addUserId, addRole);
      setAddUserId("");
      setAddRole("MEMBRO");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(userId, role) {
    setError("");
    try {
      await api.setDepartmentMember(departmentId, userId, role);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(userId, name) {
    if (!confirm(`Remover ${name} deste departamento?`)) return;
    setError("");
    try {
      await api.removeDepartmentMember(departmentId, userId);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateDepartment(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.target);
    try {
      await api.createDepartment({ nome: form.get("nome"), cor: form.get("cor") || null });
      setShowNewDept(false);
      e.target.reset();
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!departmentId) {
    return <div className="empty-state">Você ainda não está vinculado a nenhum departamento.</div>;
  }

  return (
    <div>
      <div className="header-bar">
        <div>
          <h1>Equipe</h1>
          <div className="sub">{currentDepartment?.nome}</div>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setShowNewDept(true)}>
              + Departamento
            </button>
            <button className="btn pri" onClick={() => setShowNewUser(true)}>
              + Pessoa
            </button>
          </div>
        )}
      </div>

      {error && <div className="login-err" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card">
        <div className="sec-title">Membros de {currentDepartment?.nome}</div>
        {loading ? (
          <div className="empty-state">Carregando...</div>
        ) : members.length === 0 ? (
          <div className="empty-state">Ninguém vinculado a este departamento ainda.</div>
        ) : (
          members.map((m) => (
            <div key={m.userId} className="team-row">
              <span className="team-row-av" style={{ background: colorFor(m.user.id) }}>
                {initials(m.user.name)}
              </span>
              <div className="team-row-info">
                <div className="team-row-name">
                  {m.user.name} {m.user.cargo ? `· ${m.user.cargo}` : ""}
                </div>
                <div className="team-row-email">{m.user.email}</div>
              </div>
              <div className="team-row-acts">
                {isAdmin ? (
                  <select className="select sm" value={m.role} onChange={(e) => handleRoleChange(m.userId, e.target.value)}>
                    <option value="MEMBRO">Membro</option>
                    <option value="GESTOR">Gestor</option>
                  </select>
                ) : (
                  <span className={`badge ${m.role === "GESTOR" ? "gestor" : "membro"}`}>{ROLE_LABEL[m.role]}</span>
                )}
                {isAdmin && (
                  <button className="aic aic-del" title="Remover do departamento" onClick={() => handleRemove(m.userId, m.user.name)}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isAdmin && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="sec-title">Adicionar pessoa já cadastrada a este departamento</div>
          {availableUsers.length === 0 ? (
            <div className="empty-state" style={{ padding: "1rem" }}>
              Todas as pessoas cadastradas já estão neste departamento.
            </div>
          ) : (
            <form onSubmit={handleAddExisting} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select className="select" value={addUserId} onChange={(e) => setAddUserId(e.target.value)} style={{ flex: 2, minWidth: 180 }}>
                <option value="">Selecione uma pessoa</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <select className="select" value={addRole} onChange={(e) => setAddRole(e.target.value)} style={{ maxWidth: 140 }}>
                <option value="MEMBRO">Membro</option>
                <option value="GESTOR">Gestor</option>
              </select>
              <button type="submit" className="btn pri" disabled={busy || !addUserId}>
                Adicionar
              </button>
            </form>
          )}
        </div>
      )}

      {showNewUser && (
        <div className="modal-overlay" onClick={() => setShowNewUser(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Nova pessoa</h2>
              <button type="button" className="modal-close" onClick={() => setShowNewUser(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="fg">
                <label className="inp-lbl">Nome</label>
                <input name="name" className="inp" required autoFocus />
              </div>
              <div className="fg">
                <label className="inp-lbl">E-mail</label>
                <input name="email" type="email" className="inp" required />
              </div>
              <div className="fg">
                <label className="inp-lbl">Senha provisória</label>
                <input name="password" type="password" className="inp" required minLength={6} />
              </div>
              <div className="grid2">
                <div className="fg">
                  <label className="inp-lbl">Cargo</label>
                  <input name="cargo" className="inp" placeholder="ex.: Analista de Marketing" />
                </div>
                <div className="fg">
                  <label className="inp-lbl">Papel neste departamento</label>
                  <select name="role" className="select" defaultValue="MEMBRO">
                    <option value="MEMBRO">Membro</option>
                    <option value="GESTOR">Gestor</option>
                  </select>
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 8px" }}>
                <input name="isAdmin" type="checkbox" /> Administrador (acesso total a todos os departamentos)
              </label>
              <div className="mfooter">
                <button type="button" className="btn" onClick={() => setShowNewUser(false)} disabled={busy}>
                  Cancelar
                </button>
                <button type="submit" className="btn pri" disabled={busy}>
                  {busy ? "Criando..." : "Criar pessoa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewDept && (
        <div className="modal-overlay" onClick={() => setShowNewDept(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Novo departamento</h2>
              <button type="button" className="modal-close" onClick={() => setShowNewDept(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDepartment}>
              <div className="fg">
                <label className="inp-lbl">Nome</label>
                <input name="nome" className="inp" required autoFocus placeholder="ex.: Expansão" />
              </div>
              <div className="fg">
                <label className="inp-lbl">Cor (opcional, hex)</label>
                <input name="cor" className="inp" placeholder="#0071e3" />
              </div>
              <div className="mfooter">
                <button type="button" className="btn" onClick={() => setShowNewDept(false)} disabled={busy}>
                  Cancelar
                </button>
                <button type="submit" className="btn pri" disabled={busy}>
                  {busy ? "Criando..." : "Criar departamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
