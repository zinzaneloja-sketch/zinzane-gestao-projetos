import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
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
          <Link to="/projetos" style={{ fontSize: 13 }}>
            Projetos
          </Link>
          <Link to="/time" style={{ fontSize: 13 }}>
            Time
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
