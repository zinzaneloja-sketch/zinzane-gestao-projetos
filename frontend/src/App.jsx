import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ProjectsList from "./pages/ProjectsList";
import ProjectDetail from "./pages/ProjectDetail";
import TeamKanban from "./pages/TeamKanban";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: "2rem" }}>Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/projetos" element={<ProjectsList />} />
        <Route path="/projetos/:id" element={<ProjectDetail />} />
        <Route path="/time" element={<TeamKanban />} />
        <Route path="/" element={<Navigate to="/projetos" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
