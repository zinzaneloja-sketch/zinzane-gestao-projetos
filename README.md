# Controle de Projetos e Tarefas — Zinzane

Sistema de controle de projetos e tarefas da Zinzane (varejo de moda),
organizado por **departamentos** (workspaces com acesso restrito).
Construído com backend próprio, banco de dados relacional e deploy
contínuo via GitHub + Railway.

Cada projeto e cada tarefa pertence a um departamento. Cada pessoa é
vinculada a um ou mais departamentos, com papel **Membro** ou
**Gestor**, e só vê o que é desses departamentos — exceto
administradores, que veem tudo. Departamentos iniciais: Compras,
Estilo, Marketing, Jurídico, Financeiro, Contábil/Fiscal, Departamento
Pessoal, Logística, E-commerce, Tecnologia, Expansão.

Não há distinção entre "POC" e "Projeto Final", nem fases fixas: cada
projeto tem um **status simples** (Não iniciado / Em andamento /
Concluído / Bloqueado) e uma lista de tarefas com responsável e prazo.
As tarefas também têm seu próprio kanban (A fazer, Em andamento, Em
revisão, Concluído, Bloqueado).

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
npm run prisma:seed         # cria os 11 departamentos + usuário admin
npm run dev                 # sobe em http://localhost:4000
```

Usuário criado pelo seed: `admin@zinzane.com` / senha em
`SEED_ADMIN_PASSWORD` (defina essa variável antes de rodar o seed, ou
troque a senha depois do primeiro login). Esse usuário entra como
Gestor de todos os departamentos.

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

- Autenticação (login + JWT).
- Departamentos (workspaces) com vínculo de usuários por papel
  (Membro/Gestor) e filtragem automática do que cada pessoa enxerga.
- CRUD de projetos (status simples) e tarefas, escopados por
  departamento — só o Gestor do departamento cria/edita projetos; uma
  tarefa só pode ser movida pelo próprio responsável ou por um Gestor.
- Kanban de tarefas por departamento.
- Rota de importação via IA (`/api/ai/import`), chamando a API da
  Claude diretamente do backend (a chave não fica exposta ao navegador).
- Cadastro de salários por pessoa, visível só para admins e para o
  Gestor do Departamento Pessoal.

## O que falta

- Tela de administração de departamentos e de vínculo de pessoas
  (hoje só dá pra fazer via API — `PUT /api/departments/:id/members/:userId`).
- Tela de desempenho por pessoa e arquivo de tarefas concluídas.
- Exportação de tarefas em PDF e envio por e-mail.
- Tela de salários (a API já existe).
- Dashboards/gráficos por departamento.
- Um possível módulo de pedidos/fornecedores específico do
  departamento de Compras (fora do núcleo genérico do sistema).
