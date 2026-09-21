const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Não autenticado." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, name, role, isAdmin }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Sessão inválida ou expirada." });
  }
}

// Só administradores podem passar
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Apenas administradores podem fazer isso." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
