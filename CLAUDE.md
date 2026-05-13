# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

CCB — Sistema de Controle de Presença Infantil. Backend Node.js/Express + React frontend para gestão de presença de jovens e menores da Congregação Cristã no Brasil (CCB). Três containers Docker: MariaDB, Express API (porta 3000), Nginx servindo React (porta 8080).

Produção: servidor Proxmox exposto via **Cloudflare Tunnel** apontando para `localhost:8080`.

---

## Comandos

### Backend (raiz)
```bash
npm run dev          # Servidor dev com nodemon
npm run db:push      # Sincroniza schema Prisma → DB (dev, sem migrations)
npm run db:seed      # Seed: admin, roles e permissões
npm run db:studio    # Prisma Studio em localhost:5555
npm run db:migrate   # Aplica migrations pendentes (produção)
npm run db:reset     # Destrói e recria DB (destrutivo)
npx prisma generate  # Regenera cliente Prisma após mudanças no schema
```

### Frontend (`/frontend`)
```bash
npm run dev          # Vite dev server
npm run build        # Build de produção
```

### Docker — Deploy em produção
**IMPORTANTE:** Usar sempre `docker-compose.yml` (sem `-f`). O `docker-compose.prod.yml` usa variáveis `MYSQL_*` que NÃO existem no `.env` do servidor e porta 80 (incompatível com o túnel Cloudflare que aponta para 8080). O `docker-compose.yml` usa `DB_USER`/`DB_PASSWORD` (que existem no `.env`) e porta `8080:80`.

```bash
# Deploy completo (recomendado)
./deploy.sh

# Ou manualmente:
docker compose build frontend && docker compose up -d   # rebuild e sobe tudo
docker compose up -d                                     # sobe sem rebuild
docker compose logs -f                                   # logs em tempo real
docker exec ccb_app npx prisma db push                  # aplica mudanças no schema
docker exec ccb_db mysqldump -uccb_user -p ccb > backup.sql  # backup
```

### Variáveis de ambiente (`.env`)
O `.env` do servidor usa estas chaves (não `MYSQL_*`):
```
DB_USER=ccb_user
DB_PASSWORD=<senha>
DB_ROOT_PASSWORD=<senha>
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
DATABASE_URL=mysql://ccb_user:<senha>@db:3306/ccb
```

Credenciais padrão após seed: `admin@ccb.com` / `Admin@123`

---

## Arquitetura Backend

### Padrão de módulos

Cada domínio em `src/modules/<nome>/` segue quatro arquivos:
- `*.routes.js` — Express router; encadeia `auth` → `perm(...)` → `validate(schema)` → controller
- `*.controller.js` — camada fina: chama service, retorna JSON
- `*.service.js` — lógica de negócio + queries Prisma
- `*.schema.js` — schemas Zod usados pelo middleware `validate`

### Middleware

- **`auth.js`** — verifica JWT, busca usuário completo (roles → permissões + continuações), anexa `req.usuario` com:
  - `id`, `nome`, `email`, `roles[]`, `permissoes[]`
  - `isAdminGeral` (boolean)
  - `todasContinuacoes` (true se ADMIN_GERAL)
  - `continuacoes[]` — IDs das continuações com acesso explícito
- **`permission.js`** — `perm('nome_permissao')`: ADMIN_GERAL sempre passa; demais verificam `req.usuario.permissoes`
- **`validate.js`** — valida `req.body` (ou `req.query` quando especificado) contra schema Zod
- **`upload.js`** — Multer para upload de fotos; arquivos em `/uploads/fotos/`

### RBAC

- `ADMIN_GERAL` é role fixa que bypassa todas as verificações de permissão.
- Usuários não-admin são escopados a `continuacoes` específicas via `usuario_continuacoes`.
- Permissões existentes: `lancar_presenca`, `editar_presenca`, `gerenciar_criancas`, `gerenciar_visitas`, `visualizar_dashboard`, `transferir_crianca` (apenas histórico — POST de transferência é exclusivo de ADMIN_GERAL).

### Transferências — restrição especial
`POST /api/transferencias` usa middleware `somenteAdmin` (definido inline em `transferencia.routes.js`) que bloqueia com 403 qualquer usuário que não seja `ADMIN_GERAL`, independente de ter a permissão `transferir_crianca`. O GET `/crianca/:criancaId` ainda usa `perm('transferir_crianca')`.

---

## Módulos da API

| Prefixo | Módulo | Permissão principal |
|---|---|---|
| `/api/auth` | Login, logout, `/me` | — |
| `/api/usuarios` | CRUD de usuários | ADMIN_GERAL |
| `/api/roles` | CRUD de perfis | ADMIN_GERAL |
| `/api/permissoes` | Listagem de permissões | ADMIN_GERAL |
| `/api/continuacoes` | CRUD de continuações | ADMIN_GERAL / `visualizar_dashboard` |
| `/api/criancas` | CRUD de jovens/menores | `gerenciar_criancas` |
| `/api/presencas` | Lançamento e edição de presença | `lancar_presenca` / `editar_presenca` |
| `/api/transferencias` | Transferência entre continuações | POST: ADMIN_GERAL; GET: `transferir_crianca` |
| `/api/dashboard` | Resumos, ranking, séries temporais | `visualizar_dashboard` |
| `/api/relatorios` | PDF por continuação | `visualizar_dashboard` |
| `/api/visitas` | Agendamento e gestão de visitas | `gerenciar_visitas` |

### Endpoints de dashboard
- `GET /api/dashboard/continuacao/:id` — resumo + ranking de presença por período
- `GET /api/dashboard/aniversariantes` — aniversariantes do mês
- `GET /api/dashboard/faltas-consecutivas` — crianças com faltas consecutivas (janela 30 dias)
- `GET /api/dashboard/serie-temporal` — séries temporais semanais/mensais para gráficos da aba Análise

---

## Schema do Banco (Prisma)

Modelos principais:

**`Crianca`** — campos relevantes adicionados recentemente:
- `observacao String? @db.Text` — observações internas (saúde, comportamento)
- `motivoArquivamento String?` — enum serializado: `casamento`, `transferencia_outra_congregacao`, `falecimento`, `outros: <texto>`
- `dataArquivamento DateTime?`
- `ativo Boolean @default(true)` — soft-delete

**`Presenca`** — única por `(criancaId, data)`; status: `presente | ausente | justificado`

**`Visita`** — agendamento de visita a jovem/menor; status: `pendente | concluida | remarcada`

**`Transferencia`** — histórico de movimentações entre continuações

**`AuditoriaPresenca`** — log append-only de edições de presença

---

## Arquivamento de Crianças

Soft-delete com motivo obrigatório. O `DELETE /api/criancas/:id` recebe body:
```json
{ "motivo": "casamento" }
// ou
{ "motivo": "outros", "observacao": "texto mínimo 3 chars" }
```

Validado por `arquivarCriancaSchema` (Zod + `superRefine`). O service armazena `motivoArquivamento` como `"outros: <texto>"` quando motivo é `outros`, ou o enum direto nos outros casos.

---

## Arquitetura Frontend

React 18 + Vite + TailwindCSS + React Router 6, em `frontend/src/`.

### Contextos
- **`AuthContext`** — JWT em `localStorage` (`ccb_token`); expõe `usuario`, `isAdminGeral`, `temPermissao(perm)`, `temAcessoContinuacao(id)`, `login()`, `logout()`
- **`ToastContext`** — notificações globais via `success()` / `error()`
- **`ThemeContext`** — tema claro/escuro

### Componentes globais
- `Layout` + `Sidebar` — estrutura principal com navegação
- `Modal` — modal reutilizável com prop `size` (`sm|lg`)
- `AvatarWithFallback` — avatar com fallback de iniciais
- `PdfPreview` — visualizador de PDF inline
- `PrivateRoute` — redireciona para `/login` se sem token

### Páginas e funcionalidades

**`Dashboard`** (`/dashboard`)
- Aba **Resumo**: cards de totais, ranking de presença por continuação, aniversariantes, faltas consecutivas
- Aba **Análise**: gráficos de séries temporais (presença semanal + visitas mensais) via `DashboardAnalise.jsx`

**`Criancas`** (`/criancas`)
- Abas **Ativos / Arquivados** — alternância filtra API com `?ativo=true|false`
- Clique no nome abre **modal de detalhe** (read-only): foto, dados, descrição (fundo stone-50), observação (fundo amber-50)
- Formulário: campos `descricao` e `observacao` (textarea); foto **obrigatória** em novo cadastro
- **Arquivamento**: botão lixeira só aparece na aba Ativos; modal pede motivo (select) + observação (só quando "outros")
- **Transferência**: aba "Transferir" no modal de edição visível **apenas para ADMIN_GERAL**
- Botão WhatsApp direto na lista para contato com responsável

**`Visitas`** (`/visitas`)
- Campo "Jovem / Menor" no modal de agendamento é um **combobox com busca por nome** (não select simples)
- Dropdown filtra em tempo real; fecha ao clicar fora (via `useRef` + `mousedown` listener)
- Ao editar visita existente, campo pré-preenchido com `nomeCompleto` da criança

**`Presencas`** (`/presencas`) — lançamento em checklist por continuação/data

**`Relatorios`** (`/relatorios`) — geração e preview de PDF por continuação

**`Continuacoes`**, **`Usuarios`** — CRUD admin

### API client
`frontend/src/api/client.js` — instância Axios com interceptor que injeta `Authorization: Bearer <token>` automaticamente.

Para DELETE com body (ex: arquivar criança):
```js
api.delete(`/criancas/${id}`, { data: { motivo, observacao } })
```

---

## Conceitos de Domínio

| Termo | Significado |
|---|---|
| `Continuacao` | Turma/grupo de jovens e menores |
| `Crianca` | Jovem ou menor; arquivado via `ativo: false` |
| `Presenca` | Registro de presença — único por `(criancaId, data)` |
| `Transferencia` | Movimentação de criança entre continuações (somente ADMIN_GERAL pode criar) |
| `Visita` | Agendamento de visita pastoral a um jovem/menor |
| `AuditoriaPresenca` | Log imutável de edições em registros de presença |
