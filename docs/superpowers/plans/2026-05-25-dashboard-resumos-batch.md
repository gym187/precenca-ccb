# Dashboard Resumos Batch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir 13 chamadas HTTP paralelas do Dashboard por um único endpoint `GET /api/dashboard/resumos` que retorna os resumos de todas as continuações do usuário em uma só resposta.

**Architecture:** Nova função `resumoTodasContinuacoes` no service reutiliza a lógica existente de `resumoContinuacao`, executando-a em paralelo internamente via `Promise.all`. O frontend troca o loop de requests por uma única chamada e reconstrói o `resumoMap` a partir do array retornado.

**Tech Stack:** Node.js/Express, Prisma (MySQL), React 18, Axios

---

## Arquivos Tocados

| Arquivo | Ação |
|---|---|
| `src/modules/dashboard/dashboard.service.js` | Adicionar `resumoTodasContinuacoes` + exportar |
| `src/modules/dashboard/dashboard.controller.js` | Adicionar `resumosGeral` + exportar |
| `src/modules/dashboard/dashboard.routes.js` | Adicionar rota `GET /resumos` |
| `frontend/src/pages/Dashboard.jsx` | Substituir lógica de `carregarResumos` |

---

## Task 1: Adicionar `resumoTodasContinuacoes` no service

**Files:**
- Modify: `src/modules/dashboard/dashboard.service.js`

- [ ] **Step 1: Adicionar a função antes do `module.exports`**

Abrir `src/modules/dashboard/dashboard.service.js`. Inserir o bloco abaixo imediatamente antes da linha `module.exports = { resumoContinuacao, ... }`:

```js
// ─── Resumo de todas as continuações do usuário ──────────────────────────────

const resumoTodasContinuacoes = async (params, usuario) => {
  const continuacoes = await prisma.continuacao.findMany({
    where: usuario.todasContinuacoes ? {} : { id: { in: usuario.continuacoes } },
    select: { id: true },
    orderBy: { nome: 'asc' },
  });

  return Promise.all(
    continuacoes.map((c) => resumoContinuacao(c.id, params, usuario))
  );
};
```

- [ ] **Step 2: Exportar a nova função**

Alterar a linha `module.exports` existente:

```js
// antes
module.exports = { resumoContinuacao, aniversariantesMes, faltasNoPeriodo, serieTemporal };

// depois
module.exports = { resumoContinuacao, resumoTodasContinuacoes, aniversariantesMes, faltasNoPeriodo, serieTemporal };
```

- [ ] **Step 3: Verificar sintaxe do arquivo**

```bash
node -e "require('./src/modules/dashboard/dashboard.service')" && echo OK
```

Saída esperada: `OK`

- [ ] **Step 4: Commit**

```bash
git add src/modules/dashboard/dashboard.service.js
git commit -m "feat(dashboard): adicionar resumoTodasContinuacoes no service"
```

---

## Task 2: Adicionar controller e rota

**Files:**
- Modify: `src/modules/dashboard/dashboard.controller.js`
- Modify: `src/modules/dashboard/dashboard.routes.js`

- [ ] **Step 1: Adicionar método `resumosGeral` no controller**

Abrir `src/modules/dashboard/dashboard.controller.js`. Adicionar após a função `resumoContinuacao` existente:

```js
const resumosGeral = async (req, res) => {
  const data = await service.resumoTodasContinuacoes(req.query, req.usuario);
  res.json(data);
};
```

Alterar a linha `module.exports`:

```js
// antes
module.exports = { resumoContinuacao, aniversariantes, faltasNoPeriodo, serieTemporal };

// depois
module.exports = { resumoContinuacao, resumosGeral, aniversariantes, faltasNoPeriodo, serieTemporal };
```

- [ ] **Step 2: Verificar sintaxe**

```bash
node -e "require('./src/modules/dashboard/dashboard.controller')" && echo OK
```

Saída esperada: `OK`

- [ ] **Step 3: Adicionar rota no router**

Abrir `src/modules/dashboard/dashboard.routes.js`. Adicionar a nova rota **antes** da linha `router.get('/continuacao/:continuacaoId', ...)`:

```js
// GET /api/dashboard/resumos?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
router.get('/resumos', controller.resumosGeral);
```

O arquivo completo deve ficar assim:

```js
const { Router } = require('express');
const controller = require('./dashboard.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');

const router = Router();

router.use(auth);
router.use(perm('visualizar_dashboard'));

// GET /api/dashboard/resumos?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
router.get('/resumos', controller.resumosGeral);

// GET /api/dashboard/continuacao/:continuacaoId?mes=YYYY-MM&trimestre=1|2|3|4
router.get('/continuacao/:continuacaoId', controller.resumoContinuacao);

// GET /api/dashboard/aniversariantes?mes=1-12&continuacaoId=...
router.get('/aniversariantes', controller.aniversariantes);

// GET /api/dashboard/faltas-consecutivas?continuacaoId=...&minFaltas=3 (janela 30 dias)
router.get('/faltas-consecutivas', controller.faltasNoPeriodo);

// GET /api/dashboard/serie-temporal?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
router.get('/serie-temporal', controller.serieTemporal);

module.exports = router;
```

- [ ] **Step 4: Testar endpoint com curl (servidor dev rodando)**

Obter token:
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ccb.com","password":"Admin@123"}' | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")
```

Chamar o novo endpoint:
```bash
curl -s "http://localhost:3000/api/dashboard/resumos?dataInicio=2026-04-25&dataFim=2026-05-25" \
  -H "Authorization: Bearer $TOKEN" | node -e "
    process.stdin.resume();let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      const r=JSON.parse(d);
      console.log('Total continuações:', Array.isArray(r) ? r.length : 'ERRO - não é array');
      if(Array.isArray(r) && r[0]) console.log('Primeira chaves:', Object.keys(r[0]));
    })
  "
```

Saída esperada:
```
Total continuações: <N> (número de continuações do admin)
Primeira chaves: [ 'continuacao', 'totalCriancas', 'periodo', 'ranking' ]
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/dashboard/dashboard.controller.js src/modules/dashboard/dashboard.routes.js
git commit -m "feat(dashboard): adicionar endpoint GET /api/dashboard/resumos"
```

---

## Task 3: Atualizar o frontend

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Substituir a função `carregarResumos`**

Abrir `frontend/src/pages/Dashboard.jsx`. Localizar a função `carregarResumos` (atualmente nas linhas ~61-75) e substituir integralmente:

```js
// antes
const carregarResumos = useCallback(async (conts, ini, fim) => {
  if (!ini || !fim || ini > fim) return
  setLoadingResumos(true)
  const resumoMap = {}
  await Promise.all(
    conts.map(async (c) => {
      try {
        const r = await api.get(`/dashboard/continuacao/${c.id}?dataInicio=${ini}&dataFim=${fim}`)
        resumoMap[c.id] = r.data
      } catch {}
    })
  )
  setResumos(resumoMap)
  setLoadingResumos(false)
}, [])

// depois
const carregarResumos = useCallback(async (ini, fim) => {
  if (!ini || !fim || ini > fim) return
  setLoadingResumos(true)
  try {
    const r = await api.get(`/dashboard/resumos?dataInicio=${ini}&dataFim=${fim}`)
    const resumoMap = Object.fromEntries(r.data.map((item) => [item.continuacao.id, item]))
    setResumos(resumoMap)
  } catch {}
  finally {
    setLoadingResumos(false)
  }
}, [])
```

- [ ] **Step 2: Atualizar os dois call sites de `carregarResumos`**

**Call site 1** — dentro do `useEffect` inicial (linhas ~77-95). Localizar:

```js
await carregarResumos(contRes.data, dataInicio, dataFim)
```

Substituir por:

```js
await carregarResumos(dataInicio, dataFim)
```

**Call site 2** — dentro do `useEffect` de data (linhas ~97-102). Localizar:

```js
const t = setTimeout(() => carregarResumos(continuacoes, dataInicio, dataFim), 500)
```

Substituir por:

```js
const t = setTimeout(() => carregarResumos(dataInicio, dataFim), 500)
```

- [ ] **Step 3: Verificar build sem erros**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Saída esperada: `✓ built in X.XXs` sem erros.

- [ ] **Step 4: Testar no browser (servidor dev)**

```bash
# Terminal 1 — backend
npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Abrir `http://localhost:5173`, ir em Dashboard e verificar no DevTools → Network:
- Deve aparecer **1 request** para `/api/dashboard/resumos` em vez de 13 para `/api/dashboard/continuacao/:id`
- Os cards de resumo devem renderizar normalmente

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat(dashboard): substituir N requests por endpoint único /dashboard/resumos"
```

---

## Task 4: Deploy em produção

**Files:** nenhum

- [ ] **Step 1: Push e deploy**

```bash
git push origin main
```

No servidor (192.168.10.10):
```bash
sshpass -p '75Quilos.' ssh ops@192.168.10.10 "cd ~/precenca-ccb && git pull && ./deploy.sh"
```

- [ ] **Step 2: Validar em produção**

Acessar o sistema em produção, abrir o Dashboard e verificar que:
- A página carrega normalmente
- Os cards de todas as continuações aparecem com dados
- No DevTools → Network: apenas 1 request para `/api/dashboard/resumos` ao invés de múltiplos para `/api/dashboard/continuacao/:id`

- [ ] **Step 3: Verificar logs do servidor**

```bash
sshpass -p '75Quilos.' ssh ops@192.168.10.10 "docker logs ccb_app --tail=30 2>&1 | grep dashboard"
```

Saída esperada: uma linha de log `GET /api/dashboard/resumos 200 Xms` por acesso ao Dashboard, em vez de 13 linhas.
