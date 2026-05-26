# Design — Endpoint Batched de Resumos do Dashboard

**Data:** 2026-05-25
**Status:** Aprovado

## Problema

O Dashboard chama `GET /api/dashboard/continuacao/:id` uma vez por continuação via `Promise.all`. Com 13 continuações, são 13 requests HTTP simultâneos, cada um disparando:
- 1 query de auth (findUnique com joins de roles, permissões, continuações)
- 3 queries de dashboard (findUnique cont + findMany crianças + findMany presenças)

Total: **52 queries por carregamento** competindo pelo pool de 5 conexões Prisma, saturando o banco e causando timeout em saves concorrentes.

## Solução

Novo endpoint `GET /api/dashboard/resumos?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD` que retorna os resumos de todas as continuações do usuário em uma única chamada HTTP.

Internamente o servidor executa os `resumoContinuacao` em paralelo via `Promise.all` — sem overhead de rede, sem custo de auth por chamada, aproveitando a lógica já existente e testada.

**Redução:** 52 queries → 4 queries por carregamento do dashboard.

## Backend

### `dashboard.service.js` — nova função

```js
const resumoTodasContinuacoes = async (params, usuario) => {
  const continuacoes = await prisma.continuacao.findMany({
    where: usuario.todasContinuacoes ? {} : { id: { in: usuario.continuacoes } },
    select: { id: true },
    orderBy: { nome: 'asc' },
  });

  const resultados = await Promise.all(
    continuacoes.map((c) => resumoContinuacao(c.id, params, usuario))
  );

  return resultados;
};
```

Exportar junto com as demais funções.

### `dashboard.controller.js` — novo método

```js
const resumosGeral = async (req, res) => {
  const data = await service.resumoTodasContinuacoes(req.query, req.usuario);
  res.json(data);
};
```

### `dashboard.routes.js` — nova rota

```
GET /api/dashboard/resumos?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
```

Adicionada antes da rota existente `/continuacao/:id`. Mesma proteção de auth e perm('visualizar_dashboard') já aplicadas pelo `router.use`.

O endpoint antigo `/continuacao/:id` permanece intacto.

## Frontend

### `Dashboard.jsx` — `carregarResumos`

**Antes:**
```js
const resumoMap = {}
await Promise.all(
  conts.map(async (c) => {
    const r = await api.get(`/dashboard/continuacao/${c.id}?dataInicio=${ini}&dataFim=${fim}`)
    resumoMap[c.id] = r.data
  })
)
```

**Depois:**
```js
const r = await api.get(`/dashboard/resumos?dataInicio=${ini}&dataFim=${fim}`)
const resumoMap = Object.fromEntries(r.data.map((item) => [item.continuacao.id, item]))
```

O parâmetro `conts` deixa de ser necessário na função (o backend já faz o escopo). A assinatura de `carregarResumos` simplifica e o `useCallback` não precisa mais receber `conts`.

O shape do `resumoMap` não muda — todo o JSX de renderização fica intacto.

## Shape da Resposta

```json
[
  {
    "continuacao": { "id": "uuid", "nome": "Nome da Continuação" },
    "totalCriancas": 10,
    "periodo": {
      "inicio": "2026-04-25",
      "fim": "2026-05-25",
      "totalRegistros": 40,
      "totalPresentes": 30,
      "percPresenca": 75
    },
    "ranking": [
      { "criancaId": "uuid", "nome": "Nome", "presentes": 4, "ausentes": 0, "justificados": 0, "total": 4, "percPresenca": 100 }
    ]
  }
]
```

## O Que Não Muda

- Schema do banco
- Endpoint antigo `/api/dashboard/continuacao/:id`
- Todas as outras telas e endpoints
- JSX de renderização do Dashboard
- Escopo de permissão (mesmo `perm('visualizar_dashboard')`)

## Arquivos Tocados

| Arquivo | Mudança |
|---|---|
| `src/modules/dashboard/dashboard.service.js` | Adicionar `resumoTodasContinuacoes` + exportar |
| `src/modules/dashboard/dashboard.controller.js` | Adicionar `resumosGeral` + exportar |
| `src/modules/dashboard/dashboard.routes.js` | Adicionar rota `GET /resumos` |
| `frontend/src/pages/Dashboard.jsx` | Substituir `carregarResumos` para usar novo endpoint |
