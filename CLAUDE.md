# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

CCB — Sistema de Controle de Presença Infantil. Backend Node.js + React frontend for managing child attendance at Congregação Cristã no Brasil (CCB). Three Docker containers: MariaDB, Express API (port 3000), Nginx serving React (port 8080).

## Commands

### Backend (root)
```bash
npm run dev          # Dev server with nodemon (hot-reload)
npm run start        # Production server

npm run db:push      # Sync Prisma schema → DB (dev, no migrations)
npm run db:seed      # Seed admin user, roles, and permissions
npm run db:studio    # Prisma Studio at localhost:5555
npm run db:migrate   # Apply pending migrations (production)
npm run db:reset     # Drop and recreate DB (destructive)
npx prisma generate  # Regenerate Prisma client after schema changes
```

### Frontend (`/frontend`)
```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview production build locally
```

### Docker
```bash
docker-compose up --build   # Build and start all containers
./deploy.sh                  # Full deploy script (builds, starts, applies schema)
docker-compose logs -f       # Stream logs
docker exec ccb_db mysqldump -uccb_user -pccb_pass ccb > backup.sql
```

## Architecture

### Backend — Module Pattern

Every domain feature under `src/modules/<name>/` follows the same four-file pattern:
- `*.routes.js` — Express router; applies `auth` then `requirePermissao()` middleware, then `validate()` before the controller
- `*.controller.js` — thin layer: calls service, returns JSON
- `*.service.js` — business logic + Prisma queries
- `*.schema.js` — Zod schemas used by `validate` middleware

`src/middleware/auth.js` resolves the JWT, fetches the full user (with roles → permissions and continuacao access), and attaches `req.usuario`. `src/middleware/permission.js` exports `requirePermissao(permissao)` which short-circuits for `ADMIN_GERAL`.

### RBAC

- `ADMIN_GERAL` is a fixed role that bypasses all permission checks (`isAdminGeral` flag on `req.usuario`).
- Non-admin users are scoped to specific `continuacoes` via the `usuario_continuacoes` join table; `req.usuario.todasContinuacoes` is `false` and `req.usuario.continuacoes` holds the allowed IDs.
- Permission names are plain strings (e.g. `lancar_presenca`, `gerenciar_criancas`) — they must match values in the `permissoes` table.

### Domain Concepts

| Term | Meaning |
|---|---|
| `Continuacao` | A child group / class |
| `Crianca` | A child; soft-deleted via `ativo: false` |
| `Presenca` | Attendance record — unique per `(criancaId, data)`; status is `presente`, `ausente`, or `justificado` |
| `Transferencia` | Moving a child from one `Continuacao` to another |
| `AuditoriaPresenca` | Append-only audit log for edits to attendance records |

Bulk attendance launch (`POST /api/presencas/lista`) is the primary write path — it upserts one `Presenca` row per child in the submitted list.

### Frontend

React 18 + Vite + TailwindCSS + React Router 6, all under `frontend/src/`.

- `AuthContext` stores the JWT in `localStorage` as `ccb_token` and exposes `temPermissao(perm)` and `temAcessoContinuacao(continuacaoId)` helpers — use these to conditionally render UI, mirroring backend RBAC.
- `ToastContext` provides global toast notifications.
- `frontend/src/api/client.js` — Axios instance; attaches the JWT header automatically.
- `PrivateRoute` wraps all authenticated pages; unauthenticated users are redirected to `/login`.

### Environment Variables

Copy `.env.example` → `.env` for local dev. Required:

| Variable | Description |
|---|---|
| `DATABASE_URL` | MariaDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `PORT` | API port (default `3000`) |

Default admin credentials (after seed): `admin@ccb.com` / `Admin@123`.
