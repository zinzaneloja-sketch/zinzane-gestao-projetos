-- Adiciona suporte a múltiplos responsáveis por tarefa (inclusive de
-- departamentos diferentes), sem tocar em nenhuma coluna/tabela existente.

-- CreateTable
CREATE TABLE IF NOT EXISTS "task_assignees" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("taskId","userId")
);

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_taskId_fkey"
        FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill: cada tarefa que já tinha um responsável (campo antigo,
-- de dono único) vira um vínculo em task_assignees, preservando os dados
-- existentes sem perder nada.
INSERT INTO "task_assignees" ("taskId", "userId")
SELECT "id", "responsavelId" FROM "tasks" WHERE "responsavelId" IS NOT NULL
ON CONFLICT DO NOTHING;
