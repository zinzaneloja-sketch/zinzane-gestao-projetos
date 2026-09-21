const prisma = require("./prisma");

// Departamentos aos quais o usuário pertence, com o papel em cada um.
// Admin não precisa disso para ver tudo, mas ainda é útil pra saber
// onde ele é Gestor (ex: para liberar a tela de salários).
async function getUserDepartments(userId) {
  const rows = await prisma.userDepartment.findMany({
    where: { userId },
    select: { departmentId: true, role: true },
  });
  return rows;
}

// true se o usuário pode VER o departamento (é admin, ou é membro/gestor dele)
async function canAccessDepartment(user, departmentId) {
  if (user.isAdmin) return true;
  const membership = await prisma.userDepartment.findUnique({
    where: { userId_departmentId: { userId: user.id, departmentId } },
  });
  return !!membership;
}

// true se o usuário pode GERENCIAR o departamento (admin, ou Gestor dele)
async function isDepartmentManager(user, departmentId) {
  if (user.isAdmin) return true;
  const membership = await prisma.userDepartment.findUnique({
    where: { userId_departmentId: { userId: user.id, departmentId } },
  });
  return membership?.role === "GESTOR";
}

// Lista de department_id que o usuário pode ver — usado para filtrar
// queries de projetos/tarefas. Admin recebe null (sem filtro = vê tudo).
async function visibleDepartmentIds(user) {
  if (user.isAdmin) return null;
  const rows = await prisma.userDepartment.findMany({
    where: { userId: user.id },
    select: { departmentId: true },
  });
  return rows.map((r) => r.departmentId);
}

module.exports = { getUserDepartments, canAccessDepartment, isDepartmentManager, visibleDepartmentIds };
