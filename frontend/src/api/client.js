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

// Upload de arquivo (multipart) — não usa `request` porque o corpo não é
// JSON; o navegador define o Content-Type (com boundary) sozinho.
async function uploadFile(path, file) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: formData });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status} ao enviar arquivo`);
  return data;
}

// Download de arquivo autenticado — busca como blob (com o header
// Authorization) e dispara o download no navegador via um link temporário.
async function downloadFile(path, filename) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Erro ${res.status} ao baixar arquivo`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "arquivo";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  updateTask: (id, data) => request(`/tasks/${id}`, { method: "PATCH", body: data }),
  updateTaskStatus: (id, status) => request(`/tasks/${id}/status`, { method: "PATCH", body: { status } }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),

  listUsers: (departmentId) => request(`/users${qs({ departmentId })}`),
  createUser: (data) => request("/users", { method: "POST", body: data }),

  getDesempenho: (params = {}) => request(`/dashboard/desempenho${qs(params)}`),

  listAttachments: (taskId) => request(`/tasks/${taskId}/attachments`),
  uploadAttachment: (taskId, file) => uploadFile(`/tasks/${taskId}/attachments`, file),
  downloadAttachment: (id, filename) => downloadFile(`/attachments/${id}/download`, filename),
  deleteAttachment: (id) => request(`/attachments/${id}`, { method: "DELETE" }),

  createDepartment: (data) => request("/departments", { method: "POST", body: data }),
  listDepartmentMembers: (departmentId) => request(`/departments/${departmentId}/members`),
  setDepartmentMember: (departmentId, userId, role) =>
    request(`/departments/${departmentId}/members/${userId}`, { method: "PUT", body: { role } }),
  removeDepartmentMember: (departmentId, userId) =>
    request(`/departments/${departmentId}/members/${userId}`, { method: "DELETE" }),
};

export function setToken(token) {
  if (token) localStorage.setItem("zinzane_token", token);
  else localStorage.removeItem("zinzane_token");
}

export function hasToken() {
  return !!getToken();
}
