import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/projetos");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleSubmit} style={{ width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Gestão de Projetos · Zinzane</h1>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        {error && <div style={{ color: "#d33", fontSize: 13 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ padding: 10, borderRadius: 8, background: "#0071e3", color: "#fff", border: "none" }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
