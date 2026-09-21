const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Informe e-mail e senha." });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "E-mail ou senha inválidos." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "E-mail ou senha inválidos." });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, isAdmin: user.isAdmin },
  });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Só um admin já logado pode criar novos usuários
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const { name, email, password, role, isAdmin } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role || "OPERADOR", isAdmin: !!isAdmin },
  });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

module.exports = router;
