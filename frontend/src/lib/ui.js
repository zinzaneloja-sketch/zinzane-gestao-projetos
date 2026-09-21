export const PALETTE = [
  "#0071e3",
  "#5856d6",
  "#ff9500",
  "#34c759",
  "#ff3b30",
  "#30b0c7",
  "#af52de",
  "#a2845e",
  "#ff2d55",
  "#8e8e93",
];

export function colorFor(seed) {
  const s = String(seed || "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const PROJECT_STATUS = {
  NAO_INICIADO: { label: "Não iniciado", badge: "pend" },
  EM_ANDAMENTO: { label: "Em andamento", badge: "prog" },
  CONCLUIDO: { label: "Concluído", badge: "done" },
  BLOQUEADO: { label: "Bloqueado", badge: "block" },
};

export const TASK_STATUS = {
  TODO: { label: "A fazer", badge: "todo" },
  DOING: { label: "Em andamento", badge: "doing" },
  REVIEW: { label: "Em revisão", badge: "review" },
  DONE: { label: "Concluído", badge: "done" },
  BLOCKED: { label: "Bloqueado", badge: "blocked" },
};

export const PRIORITY = {
  ALTA: { label: "Alta", badge: "alta" },
  MEDIA: { label: "Média", badge: "media" },
  BAIXA: { label: "Baixa", badge: "baixa" },
};

export function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let val = bytes;
  let i = -1;
  do {
    val /= 1024;
    i++;
  } while (val >= 1024 && i < units.length - 1);
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function isOverdue(value) {
  if (!value) return false;
  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}
