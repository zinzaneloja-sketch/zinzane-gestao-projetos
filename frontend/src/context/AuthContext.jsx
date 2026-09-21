import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setToken, hasToken } from "../api/client";

const AuthContext = createContext(null);

const DEPT_KEY = "zinzane_selected_department";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departmentId, setDepartmentId] = useState(() => localStorage.getItem(DEPT_KEY) || null);

  function applyUser(u) {
    setUser(u);
    // Se o departamento salvo não é mais válido pra esse usuário, cai no primeiro disponível
    const ids = (u?.departments || []).map((d) => d.id);
    setDepartmentId((current) => {
      if (current && (u?.isAdmin || ids.includes(current))) return current;
      return ids[0] || null;
    });
  }

  function refreshUser() {
    return api.me().then((res) => applyUser(res.user));
  }

  useEffect(() => {
    if (!hasToken()) {
      setLoading(false);
      return;
    }
    refreshUser()
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (departmentId) localStorage.setItem(DEPT_KEY, departmentId);
  }, [departmentId]);

  async function login(email, password) {
    const res = await api.login(email, password);
    setToken(res.token);
    applyUser(res.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem(DEPT_KEY);
  }

  const currentDepartment = useMemo(
    () => (user?.departments || []).find((d) => d.id === departmentId) || null,
    [user, departmentId]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, departmentId, setDepartmentId, currentDepartment, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
