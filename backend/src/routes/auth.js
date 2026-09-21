const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

async function withDepartments(user) {
  const memberships = await prisma.userDepartment.findMany({
    where: { userId: user.id },
    include: { department: { select: { id: true, nome: true, slug: true, cor: true } } },
  });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    departments: memberships.map((m) => ({ ...m.department, role: m.role })),
  };
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Informe e-mail e senha." });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "E-mail ou senha inválidos." });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "E-mail ou senha inválidos." });

  const token = signToken(user);
  res.json({ token, user: await withDepartments(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(401).json({ error: "Usuário não encontrado." });
  res.json({ user: await withDepartments(user) });
});

module.exports = router;
