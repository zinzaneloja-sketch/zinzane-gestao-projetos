const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("zinzane_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Erro ${res.status} ao chamar ${path}`);
  }
  return data;
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => request("/auth/me"),

  listProjects: () => request("/projects"),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request("/projects", { method: "POST", body: data }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: "PATCH", body: data }),
  deleteProject: (id) => request(`/projects/${id}`, { method: "DELETE" }),
  updateStage: (projectId, stageId, status) =>
    request(`/projects/${projectId}/stages/${stageId}`, { method: "PATCH", body: { status } }),
  addSupply: (projectId, data) => request(`/projects/${projectId}/supplies`, { method: "POST", body: data }),
  addLabor: (projectId, data) => request(`/projects/${projectId}/labor`, { method: "POST", body: data }),

  listTasks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/tasks${qs ? `?${qs}` : ""}`);
  },
  createTask: (data) => request("/tasks", { method: "POST", body: data }),
  updateTaskStatus: (id, status) => request(`/tasks/${id}/status`, { method: "PATCH", body: { status } }),

  listTeam: () => request("/team"),
  createTeamMember: (data) => request("/team", { method: "POST", body: data }),
};

export function setToken(token) {
  if (token) localStorage.setItem("zinzane_token", token);
  else localStorage.removeItem("zinzane_token");
}

export function hasToken() {
  return !!getToken();
}
