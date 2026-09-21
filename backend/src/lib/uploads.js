const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// Em produção isso aponta pro volume persistente do Railway (/data/uploads,
// via a env var UPLOADS_DIR) — sem isso os arquivos seriam apagados a cada
// deploy, porque o container é recriado do zero. Em dev cai numa pasta local.
const UPLOAD_DIR = process.env.UPLOADS_DIR || path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

// Só bloqueia extensões claramente executáveis — contratos, briefings,
// planilhas, imagens, zips etc. passam sem problema.
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".msi", ".dll", ".com", ".scr", ".ps1", ".jar", ".app", ".apk",
]);

function sanitizeExt(originalname) {
  const ext = path.extname(originalname || "").toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Nome gerado (nunca o nome original) — evita colisão de arquivos e
  // path traversal. O nome original fica guardado só no banco.
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${sanitizeExt(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) return cb(new Error("Tipo de arquivo não permitido."));
    cb(null, true);
  },
});

// Middleware de upload de um único arquivo, com erro tratado (tamanho,
// tipo bloqueado etc.) devolvido como JSON em vez de cair no handler
// genérico de erro 500.
function handleUpload(fieldName) {
  const mw = upload.single(fieldName);
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: `Arquivo muito grande (máximo ${MAX_FILE_SIZE / 1024 / 1024}MB).` });
        }
        return res.status(400).json({ error: err.message || "Falha ao enviar o arquivo." });
      }
      next();
    });
  };
}

function attachmentFilePath(storedName) {
  return path.join(UPLOAD_DIR, storedName);
}

module.exports = { handleUpload, attachmentFilePath, MAX_FILE_SIZE, UPLOAD_DIR };
