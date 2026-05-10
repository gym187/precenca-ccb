# Módulo de Visitas — Design

## Goal

Implementar o módulo de visitas domiciliares: agendamento, acompanhamento por status, relatório resumido e histórico integrado ao perfil da criança.

## Architecture

Novo modelo `Visita` no banco + novo módulo backend `src/modules/visitas/` seguindo o padrão routes→controller→service→schema. Nova página `Visitas.jsx` no frontend + entrada na sidebar + seção de visitas no modal de detalhe da criança no Dashboard.

## Tech Stack

Node.js/Express (CommonJS), Prisma (MariaDB), React 18, TailwindCSS, lucide-react, Axios.

---

## Banco de Dados

### Novo modelo `Visita`

```prisma
model Visita {
  id            String   @id @default(uuid())
  criancaId     String
  data          DateTime @db.Date
  hora          String   // "HH:MM"
  endereco      String
  responsavelId String
  observacao    String?  @db.Text
  status        String   @default("pendente") // "pendente" | "concluida" | "remarcada"
  criadoPor     String
  criadoEm      DateTime @default(now())

  crianca     Crianca @relation(fields: [criancaId], references: [id])
  responsavel Usuario @relation("VisitaResponsavel", fields: [responsavelId], references: [id])
  criador     Usuario @relation("VisitaCriador", fields: [criadoPor], references: [id])

  @@map("visitas")
}
```

### Mudanças em modelos existentes

Adicionar ao model `Crianca`:
```prisma
visitas Visita[]
```

Adicionar ao model `Usuario`:
```prisma
visitasResponsavel Visita[] @relation("VisitaResponsavel")
visitasCriadas     Visita[] @relation("VisitaCriador")
```

### Aplicar schema

```bash
npm run db:push
```

### Seed — nova permissão

Adicionar `'gerenciar_visitas'` à lista `PERMISSOES` e à lista `permsOperador` em `prisma/seed.js`. Rodar `npm run db:seed` após o push.

---

## Backend

### Arquivos

- Criar: `src/modules/visitas/visita.routes.js`
- Criar: `src/modules/visitas/visita.controller.js`
- Criar: `src/modules/visitas/visita.service.js`
- Criar: `src/modules/visitas/visita.schema.js`
- Modificar: `src/app.js` — registrar rota `/api/visitas`

### Endpoints

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/visitas` | `gerenciar_visitas` | Lista visitas com filtros |
| GET | `/api/visitas/resumo` | `gerenciar_visitas` | Totais por status + por continuação |
| GET | `/api/visitas/crianca/:criancaId` | `gerenciar_visitas` | Histórico de visitas de uma criança |
| POST | `/api/visitas` | `gerenciar_visitas` | Criar agendamento |
| PUT | `/api/visitas/:id` | `gerenciar_visitas` | Editar visita |
| DELETE | `/api/visitas/:id` | `gerenciar_visitas` | Remover visita |

**Importante:** A rota `GET /resumo` deve ser declarada ANTES de `GET /:id` no router para evitar conflito de rotas no Express.

### Filtros de GET /api/visitas

Query params opcionais: `status`, `criancaId`, `continuacaoId`, `dataInicio`, `dataFim`.

Quando `continuacaoId` é fornecido, filtra por `crianca.continuacaoId`.

Inclui na resposta: `crianca { id, nomeCompleto, continuacao { id, nome } }`, `responsavel { id, nome }`.

Ordenação: `data desc`, `hora desc`.

### GET /api/visitas/resumo

Retorna:
```json
{
  "total": 12,
  "porStatus": { "pendente": 5, "concluida": 6, "remarcada": 1 },
  "porContinuacao": [
    { "continuacaoId": "...", "nome": "Jovens A", "total": 7 },
    { "continuacaoId": "...", "nome": "Jovens B", "total": 5 }
  ]
}
```

`porContinuacao` é calculado via `groupBy` em `Crianca` com join em `Visita`.

### Schema Zod

```js
const visitaSchema = z.object({
  criancaId:     z.string().uuid(),
  data:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora:          z.string().regex(/^\d{2}:\d{2}$/),
  endereco:      z.string().min(1),
  responsavelId: z.string().uuid(),
  observacao:    z.string().optional(),
  status:        z.enum(['pendente', 'concluida', 'remarcada']).default('pendente'),
})

const editarVisitaSchema = visitaSchema.partial()
```

---

## Frontend

### Arquivos

- Criar: `frontend/src/pages/Visitas.jsx`
- Modificar: `frontend/src/components/Sidebar.jsx` — adicionar entrada "Visitas"
- Modificar: `frontend/src/App.jsx` — adicionar rota `/visitas`
- Modificar: `frontend/src/pages/Dashboard.jsx` — seção de visitas no detalhe da criança

### Página Visitas.jsx

**Cards de resumo (topo):**
4 cards: Total, Pendentes (âmbar), Concluídas (verde), Remarcadas (índigo). Dados de `GET /api/visitas/resumo`.

**Linha de filtros:**
- Input de busca por nome da criança (filtro local na lista)
- Select de status: Todos / Pendente / Concluída / Remarcada
- Select de continuação (lista de `GET /continuacoes/todas`)
- Botão "Agendar Visita" (abre modal)

**Lista de visitas:**
Cada item exibe:
- Nome da criança + badge da continuação
- Data formatada (DD/MM/AAAA) + hora + endereço
- Nome do responsável pela visita
- Badge colorido de status
- Botões: editar (ícone lápis) + excluir (ícone lixeira com confirmação)

**Modal de agendamento/edição:**
Campos:
- Select de criança (busca por nome, lista de `GET /api/criancas?ativo=true`)
- Input date (data)
- Input text hora (placeholder "14:00")
- Input text endereço
- Select de responsável (lista de `GET /api/usuarios` — apenas usuários ativos)
- Textarea observação (opcional)
- Select de status (pendente / concluída / remarcada) — default "pendente" ao criar

**Cores dos badges de status:**
- `pendente` → âmbar (`bg-amber-100 text-amber-700`)
- `concluida` → verde (`bg-emerald-100 text-emerald-700`)
- `remarcada` → índigo (`bg-indigo-100 text-indigo-700`)

### Sidebar

Adicionar entre "Relatórios" e "Usuários":
```js
{ to: '/visitas', label: 'Visitas', icon: MapPin }
```

Ícone: `MapPin` de lucide-react.

### Rota em App.jsx

```jsx
import Visitas from './pages/Visitas'
// ...
<Route path="/visitas" element={<Visitas />} />
```

### Dashboard — integração no detalhe da criança

No modal `criancaDetalhe`, após a seção de estatísticas de presença, adicionar uma seção "Visitas":

- Busca via `GET /api/visitas/crianca/:criancaId` ao abrir o detalhe (junto com as outras chamadas existentes)
- Exibe as últimas 5 visitas: data, hora, status (badge), responsável
- Se não houver visitas: texto "Nenhuma visita registrada."

---

## RBAC

Sem restrição por continuação — qualquer usuário autenticado com permissão `gerenciar_visitas` pode ver e gerenciar todas as visitas.

---

## Error Handling

- Visita não encontrada (GET/PUT/DELETE) → 404 `{ erro: 'Visita não encontrada.' }`
- Criança inválida → 404 `{ erro: 'Criança não encontrada.' }`
- Usuário responsável inválido → 404 `{ erro: 'Usuário não encontrado.' }`
- Frontend: toast de sucesso/erro padrão do `ToastContext`

---

## Testes Manuais

1. Criar agendamento → aparece na lista com status "Pendente"
2. Editar status para "Concluída" → badge muda, card do resumo atualiza
3. Abrir detalhe de uma criança no Dashboard → seção Visitas exibe o histórico
4. Filtrar por continuação → lista filtra corretamente
5. Excluir visita → some da lista com confirmação
