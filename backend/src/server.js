require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const departmentRoutes = require("./routes/departments");
const userRoutes = require("./routes/users");
const aiRoutes = require("./routes/ai");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "zinzane-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);

// Handler de erro genérico — evita vazar stack trace em produção
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Zinzane backend rodando na porta ${PORT}`);
});
