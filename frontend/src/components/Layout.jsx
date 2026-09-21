import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { colorFor, initials } from "../lib/ui";

export default function Layout() {
  const { user, logout, departmentId, setDepartmentId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const isTasks = location.pathname.startsWith("/tarefas");
  const isTeam = location.pathname.startsWith("/equipe");

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-left">
          <div className="topbar-logo">🧵</div>
          <div>
            <div className="topbar-title">Zinzane</div>
            <div className="topbar-subtitle">Gestão de Projetos e Tarefas</div>
          </div>

          {(user?.departments || []).length > 0 && (
            <select
              className="select pill"
              value={departmentId || ""}
              onChange={(e) => setDepartmentId(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              {(user?.departments || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome} {d.role === "GESTOR" ? "· Gestor" : ""}
                </option>
              ))}
            </select>
          )}

          <Link to="/projetos" className={`nav-pill ${!isTasks && !isTeam ? "active-proj" : ""}`}>
            Projetos
          </Link>
          <Link to="/tarefas" className={`nav-pill ${isTasks ? "active-time" : ""}`}>
            Tarefas
          </Link>
          <Link to="/equipe" className={`nav-pill ${isTeam ? "active-team" : ""}`}>
            Equipe
          </Link>
        </div>
        <div className="topbar-right">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
            aria-label="Alternar tema claro/escuro"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <div className="user-chip">
            <div className="user-chip-av" style={{ background: colorFor(user?.email) }}>
              {initials(user?.name)}
            </div>
            <span className="user-chip-name">{user?.name}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Sair
          </button>
        </div>
      </div>
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}
