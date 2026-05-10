# Design — Melhorias precenca-ccb

**Data:** 2026-05-10  
**Status:** Aprovado

---

## Escopo

Cinco melhorias ao sistema de controle de presença infantil da CCB. Sem alteração de schema do banco. Sem novas dependências externas.

Fora do escopo: tipo de reunião (apenas `reuniao_jovens` é usado), rate limiting.

---

## 1. Fix N+1 em `faltasNoPeriodo` (backend)

**Arquivo:** `src/modules/dashboard/dashboard.service.js`

**Problema atual:** função `faltasConsecutivas` dispara 1 query Prisma por criança dentro de um loop — O(N) queries.

**Nova lógica:**
- Renomear função de `faltasConsecutivas` para `faltasNoPeriodo`
- Renomear campo de resposta de `faltasConsecutivas` para `faltasNoPeriodo`
- Janela fixa: últimos 30 dias (`data >= hoje - 30d`)
- Threshold padrão: `minFaltas = 3` (era 2)
- **2 queries fixas** independente do número de crianças:
  1. `prisma.crianca.findMany(...)` — lista de crianças com acesso
  2. `prisma.presenca.findMany({ where: { criancaId: { in: ids }, data: { gte: inicio30d }, status: { not: 'presente' } } })` — faltas no período
- Agrupamento e contagem feitos em memória (JS)
- Filtrar crianças com `count >= minFaltas`
- Ordenar por `faltasNoPeriodo` decrescente

**Impacto em outros arquivos:**
- `dashboard.controller.js` — atualizar nome do campo se exposto diretamente
- `Dashboard.jsx` — atualizar referência `faltasConsecutivas` → `faltasNoPeriodo`

---

## 2. Aviso de presença já lançada + Lista de datas (backend + frontend)

### Backend

**Novo endpoint:** `GET /api/presencas/datas`

**Query params:** `continuacaoId` (obrigatório)

**Auth:** requer `lancar_presenca` (mesmo middleware das outras rotas de presença)

**Resposta:**
```json
[
  { "data": "2026-05-04", "total": 12 },
  { "data": "2026-04-27", "total": 11 }
]
```
Ordenado decrescente. Sem paginação — continuações têm no máximo dezenas de datas.

**Arquivos:**
- `src/modules/presencas/presenca.service.js` — nova função `listarDatas`
- `src/modules/presencas/presenca.routes.js` — nova rota `GET /datas`
- `src/modules/presencas/presenca.controller.js` — novo handler `getDatas`

### Frontend (`Presencas.jsx`)

- Ao selecionar continuação, dispara `GET /presencas/datas?continuacaoId=...` e armazena em state `datasLancadas`
- Exibe abaixo dos controles (só quando continuação selecionada):
  ```
  Últimos lançamentos: 04/05 · 27/04 · 20/04 · 13/04 · 06/04
  ```
  Máximo 5 datas. Cada data é clicável e preenche o campo de data.
- Quando `data` selecionada está em `datasLancadas`, exibe badge âmbar:
  `"Editando — presença já lançada"` ao lado do botão "Carregar lista"

---

## 3. Busca por nome na lista de presença (frontend)

**Arquivo:** `Presencas.jsx`

- Input de texto exibido após `carregado === true && criancas.length > 0`
- Filtra array `criancas` localmente (sem nova chamada ao backend): `crianca.nomeCompleto.toLowerCase().includes(busca.toLowerCase())`
- State: `busca` (string)
- `busca` é resetada ao recarregar a lista
- Placeholder: `"Filtrar por nome..."`
- Posição: acima das ações em lote ("Marcar todos:")

---

## 4. Botão WhatsApp para responsável (frontend)

**Arquivo:** `Dashboard.jsx` — seção de faltas no período

**Lógica:**
- Sanitizar `telefoneResponsavel`: remover tudo que não for dígito — `tel.replace(/\D/g, '')`
- Não exibir botão se telefone vazio
- URL: `https://wa.me/55{tel}?text={mensagem}`
- Mensagem (encodeURIComponent):
  ```
  Paz de Deus {nomeResponsavel} sou auxiliar da {nomeCrianca}, podemos conversar?
  ```
- Abrir em `target="_blank" rel="noopener noreferrer"`
- Ícone: usar `MessageCircle` do lucide-react (já instalado)
- Botão pequeno, estilo discreto, ao lado do nome da criança em cada linha da lista de faltas

---

## 5. Export CSV (backend + frontend)

### Backend

**Novo endpoint:** `GET /api/relatorios/csv`

**Query params:** `continuacaoId` (obrigatório), `periodo` (opcional, mesmos valores do PDF: `1m`, `3m`, `6m`, `12m`)

**Auth:** mesma permissão das rotas de relatório existentes

**Geração:** string CSV pura, sem biblioteca. Header:
```
Nome,Continuação,Presenças,Faltas,Justificados,Total,% Presença
```

**Response headers:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="presencas_{nomeCont}_{periodo}.csv"
```

**Arquivos:**
- `src/modules/relatorios/relatorio.service.js` — nova função `gerarCsv`
- `src/modules/relatorios/relatorio.routes.js` — nova rota `GET /csv`
- `src/modules/relatorios/relatorio.controller.js` — novo handler `getCsv`

### Frontend (`Relatorios.jsx`)

- Botão "Exportar CSV" ao lado do botão de PDF existente, mesmo visual (`btn-secondary`)
- Download via Axios (para enviar o header JWT) recebendo resposta como `blob`, criando URL temporário e clicando num anchor programático:
  ```js
  const res = await api.get('/relatorios/csv', { params: { continuacaoId, periodo }, responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a'); a.href = url; a.download = 'presencas.csv'; a.click()
  URL.revokeObjectURL(url)
  ```

---

## Arquivos alterados (resumo)

| Arquivo | Tipo de mudança |
|---------|----------------|
| `src/modules/dashboard/dashboard.service.js` | Refactor faltasNoPeriodo |
| `src/modules/dashboard/dashboard.controller.js` | Atualizar campo se necessário |
| `src/modules/presencas/presenca.service.js` | Nova função listarDatas |
| `src/modules/presencas/presenca.routes.js` | Nova rota GET /datas |
| `src/modules/presencas/presenca.controller.js` | Novo handler getDatas |
| `src/modules/relatorios/relatorio.service.js` | Nova função gerarCsv |
| `src/modules/relatorios/relatorio.routes.js` | Nova rota GET /csv |
| `src/modules/relatorios/relatorio.controller.js` | Novo handler getCsv |
| `frontend/src/pages/Presencas.jsx` | Busca por nome + aviso + datas |
| `frontend/src/pages/Dashboard.jsx` | Botão WhatsApp + rename faltasNoPeriodo |
| `frontend/src/pages/Relatorios.jsx` | Botão exportar CSV |

**Schema Prisma:** sem alterações.  
**Novas dependências:** nenhuma.
