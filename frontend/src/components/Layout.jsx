import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout, departmentId, setDepartmentId } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <strong>Zinzane</strong>
          <select
            value={departmentId || ""}
            onChange={(e) => setDepartmentId(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd" }}
          >
            {(user?.departments || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome} {d.role === "GESTOR" ? "· Gestor" : ""}
              </option>
            ))}
          </select>
          <Link to="/projetos" style={{ fontSize: 13 }}>
            Projetos
          </Link>
          <Link to="/tarefas" style={{ fontSize: 13 }}>
            Tarefas
          </Link>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13 }}>
          <span>{user?.name}</span>
          <button onClick={handleLogout} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#0071e3" }}>
            Sair
          </button>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
