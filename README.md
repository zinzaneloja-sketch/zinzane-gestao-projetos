# Gestão de Projetos — Zinzane

Sistema de gestão de projetos e time da Zinzane, inspirado no sistema
"Gestão de Projetos Moveridei", reconstruído com backend próprio,
banco de dados relacional e deploy contínuo via GitHub + Railway.

Fluxo de projetos: **POC → Projeto Final**, com 4 macro-etapas
(Preparação, Aquisição, Execução, Encerramento), controle de insumos e
mão de obra por projeto, e um kanban de tarefas do time (A fazer, Em
andamento, Em revisão, Concluído, Bloqueado).

## Stack

- **Backend**: Node.js + Express + Prisma + PostgreSQL, autenticação JWT.
- **Frontend**: React + Vite + React Router.
- **Infra**: GitHub (código e histórico) + Railway (Postgres gerenciado,
  deploy automático a cada push).

## Estrutura

```
backend/     API REST + schema Prisma (banco de dados)
frontend/    Aplicação React (telas do sistema)
```

## Rodando localmente

### 1. Backend

```bash
cd backend
cp .env.example .env        # ajuste DATABASE_URL e JWT_SECRET
npm install
npm run prisma:migrate:dev  # cria as tabelas
npm run prisma:seed         # cria o usuário admin inicial
npm run dev                 # sobe em http://localhost:4000
```

Usuário criado pelo seed: `admin@zinzane.com` / senha em
`SEED_ADMIN_PASSWORD` (defina essa variável antes de rodar o seed, ou
troque a senha depois do primeiro login).

### 2. Frontend

```bash
cd frontend
cp .env.example .env        # aponte VITE_API_URL para o backend
npm install
npm run dev                 # sobe em http://localhost:5173
```

## Deploy no Railway

1. Suba este repositório no GitHub (veja "Conectando ao GitHub" abaixo).
2. No Railway, crie um projeto novo e adicione um banco **PostgreSQL**
   (Railway já expõe a variável `DATABASE_URL` automaticamente para
   serviços no mesmo projeto).
3. Adicione um serviço a partir do repositório GitHub, com **Root
   Directory** = `backend`. Configure as variáveis: `DATABASE_URL`
   (referência ao Postgres do passo 2), `JWT_SECRET`, `FRONTEND_URL`
   (preenchida depois de criar o serviço do frontend) e, opcionalmente,
   `ANTHROPIC_API_KEY`.
4. Adicione um segundo serviço a partir do mesmo repositório, com
   **Root Directory** = `frontend`. Configure `VITE_API_URL` apontando
   para a URL pública do serviço backend (ex.:
   `https://SEU-BACKEND.up.railway.app/api`).
5. Gere domínios públicos para os dois serviços (Settings → Networking
   → Generate Domain).
6. Rode o seed uma vez em produção: no serviço backend, abra um shell
   (Railway → serviço → "..." → Run Command) e execute
   `npm run prisma:seed`.

Cada push na branch principal do GitHub dispara um novo deploy
automático dos dois serviços.

## Conectando ao GitHub

```bash
git remote add origin https://github.com/SEU-USUARIO/zinzane-gestao-projetos.git
git push -u origin main
```

Depois, no Railway, use "Deploy from GitHub repo" e selecione esse
repositório para cada um dos dois serviços.

## O que já está implementado

- Autenticação (login + JWT), níveis de acesso (admin/operador).
- CRUD de projetos com as 4 macro-etapas e controle de status por fase.
- Insumos e mão de obra por projeto.
- Kanban de tarefas do time, com a regra "só o responsável conclui a
  própria tarefa" para operadores.
- Rota de importação via IA (`/api/ai/import`), chamando a API da
  Claude diretamente do backend (a chave não fica exposta ao navegador).

## O que falta para paridade completa com o sistema original

- Projetos contínuos com ciclos de entrega (schema já existe: tabelas
  `project_cycles`, `cycle_checklist_items`, `cycle_links`; falta a
  API e a tela).
- Tela de desempenho por pessoa e arquivo de tarefas concluídas.
- Exportação de tarefas em PDF e envio por e-mail.
- Cadastro e histórico de salários (API já existe; falta a tela).
- Dashboards/gráficos.
