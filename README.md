# CCB — Sistema de Controle de Presença Infantil

Backend completo para gerenciamento de presença de crianças na **Congregação Cristã no Brasil (CCB)**, com RBAC dinâmico, auditoria e dashboard analítico.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| ORM | Prisma 5 |
| Banco | MariaDB 10.11 |
| Autenticação | JWT + bcrypt |
| Validação | Zod |
| Containerização | Docker + docker-compose |

---

## Início Rápido (Docker)

**Pré-requisito:** Docker Desktop instalado.

```bash
# 1. Clone ou baixe o projeto
cd projeto-presença

# 2. Suba os contêineres (banco + app)
docker-compose up --build

# A aplicação estará disponível em http://localhost:3000
```

O `entrypoint.sh` automaticamente:
1. Sincroniza o schema com o banco (`prisma db push`)
2. Executa o seed (cria admin, roles e permissões)
3. Inicia o servidor

### Credenciais padrão

| Campo | Valor |
|---|---|
| E-mail | `admin@ccb.com` |
| Senha | `Admin@123` |

---

## Desenvolvimento Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com as credenciais do seu banco local

# 3. Sincronizar banco e gerar cliente
npm run db:push
npx prisma generate

# 4. Executar seed
npm run db:seed

# 5. Iniciar em modo dev (hot-reload)
npm run dev
```

### Gerar migration para produção

```bash
# Na primeira vez (gera a migration inicial)
npx prisma migrate dev --name init

# Em produção, aplica migrations pendentes
npm run db:migrate
```

---

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | String de conexão MariaDB | — |
| `JWT_SECRET` | Chave secreta JWT | — |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |
| `PORT` | Porta do servidor | `3000` |
| `NODE_ENV` | Ambiente | `development` |

---

## API — Rotas Principais

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/login` | Login (retorna JWT) |
| `GET` | `/api/auth/me` | Dados do usuário autenticado |

**Login:**
```json
POST /api/auth/login
{ "email": "admin@ccb.com", "password": "Admin@123" }
```

---

### Usuários (`gerenciar_usuarios`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/usuarios` | Listar usuários |
| `POST` | `/api/usuarios` | Criar usuário |
| `PUT` | `/api/usuarios/:id` | Atualizar usuário |
| `DELETE` | `/api/usuarios/:id` | Remover usuário |
| `POST` | `/api/usuarios/:id/roles` | Atribuir role |
| `DELETE` | `/api/usuarios/:id/roles/:roleId` | Remover role |

---

### Roles (`gerenciar_roles`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/roles` | Listar roles |
| `POST` | `/api/roles` | Criar role |
| `PUT` | `/api/roles/:id` | Atualizar role |
| `DELETE` | `/api/roles/:id` | Remover role (não-fixas) |
| `POST` | `/api/roles/:id/permissoes` | Atribuir permissão |
| `DELETE` | `/api/roles/:id/permissoes/:permissaoId` | Remover permissão |

---

### Permissões (`gerenciar_permissoes`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/permissoes` | Listar permissões |
| `POST` | `/api/permissoes` | Criar permissão |
| `DELETE` | `/api/permissoes/:id` | Remover permissão |

---

### Continuações (`gerenciar_continuacoes`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/continuacoes` | Listar todas |
| `GET` | `/api/continuacoes/:id` | Detalhe (com crianças) |
| `POST` | `/api/continuacoes` | Criar |
| `PUT` | `/api/continuacoes/:id` | Atualizar |
| `DELETE` | `/api/continuacoes/:id` | Remover |

---

### Crianças (`gerenciar_criancas`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/criancas?continuacaoId=&ativo=` | Listar |
| `GET` | `/api/criancas/:id` | Detalhe + transferências |
| `POST` | `/api/criancas` | Cadastrar |
| `PUT` | `/api/criancas/:id` | Atualizar |
| `DELETE` | `/api/criancas/:id` | Inativar (soft delete) |
| `GET` | `/api/criancas/:id/historico?mes=YYYY-MM` | Histórico de presença |

**Filtros do histórico:**
- `?mes=YYYY-MM` — mês específico
- `?trimestre=1|2|3|4` — trimestre do ano atual
- `?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD` — período customizado

---

### Presenças

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| `POST` | `/api/presencas/lista` | `lancar_presenca` | Lançamento em checklist |
| `GET` | `/api/presencas` | `lancar_presenca` | Listar com filtros |
| `PUT` | `/api/presencas/:id` | `editar_presenca` | Editar presença + auditoria |
| `GET` | `/api/presencas/:id/auditoria` | `editar_presenca` | Histórico de alterações |

**Lançamento em lista:**
```json
POST /api/presencas/lista
{
  "data": "2026-03-30",
  "tipoReuniao": "reuniao_jovens",
  "presencas": [
    { "criancaId": "uuid-criança-1", "status": "presente" },
    { "criancaId": "uuid-criança-2", "status": "ausente" },
    { "criancaId": "uuid-criança-3", "status": "justificado" }
  ]
}
```

---

### Transferências (`transferir_crianca`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/transferencias` | Transferir criança |
| `GET` | `/api/transferencias/crianca/:id` | Histórico de transferências |

---

### Dashboard (`visualizar_dashboard`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/dashboard/continuacao/:id?mes=YYYY-MM` | Resumo + ranking |
| `GET` | `/api/dashboard/aniversariantes?mes=1-12` | Aniversariantes do mês |
| `GET` | `/api/dashboard/faltas-consecutivas?minFaltas=2` | Alerta de faltas |

---

## Permissões do Sistema

| Permissão | Descrição |
|---|---|
| `gerenciar_criancas` | CRUD de crianças |
| `lancar_presenca` | Lançar lista de presença |
| `editar_presenca` | Editar registros de presença |
| `visualizar_dashboard` | Acesso ao dashboard analítico |
| `transferir_crianca` | Transferir crianças de continuação |
| `gerenciar_usuarios` | CRUD de usuários |
| `gerenciar_roles` | CRUD de roles/perfis |
| `gerenciar_permissoes` | CRUD de permissões |
| `gerenciar_continuacoes` | CRUD de continuações |

> **ADMIN_GERAL** é um perfil fixo que ignora todas as validações de permissão — tem acesso irrestrito e não pode ser removido.

---

## Estrutura do Projeto

```
src/
├── app.js                      # Configuração Express
├── index.js                    # Entrypoint
├── config/
│   ├── jwt.js                  # Token JWT
│   └── prisma.js               # Cliente Prisma
├── middleware/
│   ├── auth.js                 # Verifica JWT + carrega usuário
│   ├── permission.js           # Verifica permissão específica
│   ├── errorHandler.js         # Tratamento global de erros
│   └── validate.js             # Validação Zod
├── utils/
│   ├── logger.js
│   └── AppError.js
└── modules/
    ├── auth/
    ├── usuarios/
    ├── roles/
    ├── permissoes/
    ├── continuacoes/
    ├── criancas/
    ├── presencas/
    ├── transferencias/
    └── dashboard/

prisma/
├── schema.prisma
└── seed.js
```

---

## Health Check

```bash
GET /api/health
# { "status": "ok", "timestamp": "..." }
```
