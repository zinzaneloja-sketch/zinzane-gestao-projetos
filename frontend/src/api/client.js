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

function qs(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  me: () => request("/auth/me"),

  listDepartments: () => request("/departments"),

  listProjects: (params = {}) => request(`/projects${qs(params)}`),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request("/projects", { method: "POST", body: data }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: "PATCH", body: data }),
  deleteProject: (id) => request(`/projects/${id}`, { method: "DELETE" }),

  listTasks: (params = {}) => request(`/tasks${qs(params)}`),
  createTask: (data) => request("/tasks", { method: "POST", body: data }),
  updateTaskStatus: (id, status) => request(`/tasks/${id}/status`, { method: "PATCH", body: { status } }),

  listUsers: (departmentId) => request(`/users${qs({ departmentId })}`),
};

export function setToken(token) {
  if (token) localStorage.setItem("zinzane_token", token);
  else localStorage.removeItem("zinzane_token");
}

export function hasToken() {
  return !!getToken();
}
