const express = require("express");
const fs = require("fs");
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { canAccessDepartment, isDepartmentManager } = require("../lib/access");
const { attachmentFilePath } = require("../lib/uploads");

const router = express.Router();
router.use(requireAuth);

async function loadAttachmentWithTask(id) {
  return prisma.taskAttachment.findUnique({
    where: { id },
    include: { task: { include: { assignees: true } } },
  });
}

// GET /api/attachments/:id/download
router.get("/:id/download", async (req, res) => {
  const attachment = await loadAttachmentWithTask(req.params.id);
  if (!attachment) return res.status(404).json({ error: "Anexo não encontrado." });

  const { task } = attachment;
  const isOwner = task.assignees.some((a) => a.userId === req.user.id);
  if (!isOwner && !(await canAccessDepartment(req.user, task.departmentId))) {
    return res.status(403).json({ error: "Sem permissão para baixar este anexo." });
  }

  const filePath = attachmentFilePath(attachment.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Arquivo não encontrado no servidor." });

  // Força download em vez de renderizar inline — evita que um arquivo
  // malicioso disfarçado (ex.: .html/.svg) execute algo no navegador.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.download(filePath, attachment.filename, (err) => {
    if (err && !res.headersSent) res.status(500).json({ error: "Erro ao baixar o arquivo." });
  });
});

// DELETE /api/attachments/:id — quem enviou, o Gestor do departamento
// da tarefa, ou um admin.
router.delete("/:id", async (req, res) => {
  const attachment = await loadAttachmentWithTask(req.params.id);
  if (!attachment) return res.status(404).json({ error: "Anexo não encontrado." });

  const { task } = attachment;
  const isUploader = attachment.uploadedById === req.user.id;
  if (!isUploader && !(await isDepartmentManager(req.user, task.departmentId))) {
    return res.status(403).json({ error: "Sem permissão para excluir este anexo." });
  }

  await prisma.taskAttachment.delete({ where: { id: attachment.id } });
  fs.unlink(attachmentFilePath(attachment.storedName), () => {});
  res.status(204).end();
});

module.exports = router;
