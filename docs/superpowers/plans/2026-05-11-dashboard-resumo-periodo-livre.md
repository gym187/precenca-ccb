# Dashboard Resumo — Seletor de Período Livre — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir os botões fixos de período no Resumo do Dashboard por inputs de data livre (`De … até …`), consistente com a aba Análise.

**Architecture:** O backend já aceita `mes`/`trimestre`/`periodo` via `resolverIntervalo`; basta adicionar suporte a `dataInicio`/`dataFim` como novo caso prioritário. No frontend, o estado `periodo` é removido e substituído por `dataInicio`/`dataFim`, com debounce de 500 ms e query string atualizada.

**Tech Stack:** Node.js / Express, Prisma, React 18, Vite, TailwindCSS

---

### Task 1: Backend — suporte a `dataInicio`/`dataFim` em `resolverIntervalo`

**Files:**
- Modify: `src/utils/dateRange.js`

- [ ] **Step 1: Adicionar suporte a `dataInicio`/`dataFim` em `resolverIntervalo`**

Abra `src/utils/dateRange.js` e altere a função `resolverIntervalo` para aceitar os novos parâmetros como primeiro caso verificado:

```js
const resolverIntervalo = ({ mes, trimestre, periodo, dataInicio, dataFim } = {}) => {
  if (dataInicio && dataFim) {
    return {
      inicio: new Date(dataInicio + 'T00:00:00'),
      fim:    new Date(dataFim   + 'T23:59:59'),
    };
  }

  if (mes) return intervaloPorMes(mes);
  if (trimestre) return intervaloPorTrimestre(trimestre);

  const now = new Date();
  if (periodo === 'all') return null;

  if (periodo) {
    const meses = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[periodo];
    if (meses) {
      const fim = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const inicio = new Date(fim);
      inicio.setMonth(inicio.getMonth() - meses);
      return { inicio, fim };
    }
  }

  return intervaloPorMes(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
};
```

- [ ] **Step 2: Verificar o endpoint manualmente**

Com o servidor rodando (`npm run dev` na raiz), execute no terminal:

```bash
curl -s "http://localhost:3000/api/dashboard/continuacao/1?dataInicio=2025-01-01&dataFim=2025-03-31" \
  -H "Authorization: Bearer <seu_token>" | jq '.periodo'
```

Resultado esperado: objeto com `inicio`, `fim`, `totalRegistros`, `totalPresentes`, `percPresenca` — sem erro 500.

- [ ] **Step 3: Commit**

```bash
git add src/utils/dateRange.js
git commit -m "feat(dashboard): resolverIntervalo aceita dataInicio/dataFim"
```

---

### Task 2: Frontend — substituir seletor de período por date inputs

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Remover `PERIODOS` e estado `periodo`; adicionar `dataInicio`/`dataFim`**

No topo do arquivo, remova o array `PERIODOS` e a constante auxiliar `toISO`:

```js
// REMOVER:
const PERIODOS = [
  { v: '1m', l: '1 Mês' },
  { v: '3m', l: '3 Meses' },
  { v: '6m', l: '6 Meses' },
  { v: '12m', l: '1 Ano' },
  { v: 'all', l: 'Tudo' },
]
```

Adicione as funções de data padrão antes do componente:

```js
const toISO = (d) => d.toISOString().slice(0, 10)

const defaultInicio = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return toISO(d)
}
```

- [ ] **Step 2: Atualizar os estados dentro do componente**

Dentro de `export default function Dashboard()`, substitua:

```js
// REMOVER:
const [periodo, setPeriodo] = useState('1m')
const [loadingResumos, setLoadingResumos] = useState(false)
```

Por:

```js
const [dataInicio, setDataInicio] = useState(defaultInicio)
const [dataFim, setDataFim] = useState(() => toISO(new Date()))
const [loadingResumos, setLoadingResumos] = useState(false)
```

- [ ] **Step 3: Atualizar `carregarResumos`**

Substitua a função `carregarResumos`:

```js
// ANTES:
const carregarResumos = useCallback(async (conts, per) => {
  setLoadingResumos(true)
  const resumoMap = {}
  await Promise.all(
    conts.map(async (c) => {
      try {
        const r = await api.get(`/dashboard/continuacao/${c.id}?periodo=${per}`)
        resumoMap[c.id] = r.data
      } catch {}
    })
  )
  setResumos(resumoMap)
  setLoadingResumos(false)
}, [])
```

```js
// DEPOIS:
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
```

- [ ] **Step 4: Atualizar os `useEffect`**

Substitua os dois `useEffect` existentes:

```js
// ANTES — useEffect inicial:
useEffect(() => {
  const fetchAll = async () => {
    try {
      const [contRes, anivRes, faltasRes] = await Promise.all([
        api.get('/continuacoes'),
        api.get('/dashboard/aniversariantes'),
        api.get('/dashboard/faltas-consecutivas?minFaltas=3'),
      ])
      setContinuacoes(contRes.data)
      setAniversariantes(anivRes.data)
      setFaltas(faltasRes.data)
      await carregarResumos(contRes.data, periodo)
    } finally {
      setLoading(false)
    }
  }
  fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

// ANTES — useEffect de período:
useEffect(() => {
  if (continuacoes.length > 0) {
    carregarResumos(continuacoes, periodo)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [periodo])
```

```js
// DEPOIS — useEffect inicial:
useEffect(() => {
  const fetchAll = async () => {
    try {
      const [contRes, anivRes, faltasRes] = await Promise.all([
        api.get('/continuacoes'),
        api.get('/dashboard/aniversariantes'),
        api.get('/dashboard/faltas-consecutivas?minFaltas=3'),
      ])
      setContinuacoes(contRes.data)
      setAniversariantes(anivRes.data)
      setFaltas(faltasRes.data)
      await carregarResumos(contRes.data, dataInicio, dataFim)
    } finally {
      setLoading(false)
    }
  }
  fetchAll()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

// DEPOIS — useEffect com debounce nas datas:
useEffect(() => {
  if (continuacoes.length === 0) return
  const t = setTimeout(() => carregarResumos(continuacoes, dataInicio, dataFim), 500)
  return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [dataInicio, dataFim])
```

- [ ] **Step 5: Atualizar `labelPeriodo`**

Substitua a linha:

```js
// ANTES:
const labelPeriodo = PERIODOS.find((p) => p.v === periodo)?.l ?? '-'
```

```js
// DEPOIS:
const fmtData = (iso) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
const labelPeriodo = `${fmtData(dataInicio)} – ${fmtData(dataFim)}`
```

- [ ] **Step 6: Atualizar a UI — substituir pill buttons por date inputs**

No JSX, dentro de `{aba === 'resumo' && (`, substitua o bloco de controles:

```jsx
{/* ANTES */}
<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
  <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
    {PERIODOS.map((p) => (
      <button
        key={p.v}
        onClick={() => setPeriodo(p.v)}
        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
          periodo === p.v
            ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm'
            : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
        }`}
      >
        {p.l}
      </button>
    ))}
  </div>
  {isAdminGeral && (
    <button
      onClick={() => abrirPdf(`/relatorios/geral?periodo=${periodo}`, `relatorio_geral_${periodo}.pdf`)}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-600 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
    >
      <FileDown size={13} />
      Relatório Geral PDF
    </button>
  )}
</div>
```

```jsx
{/* DEPOIS */}
<div className="flex flex-wrap items-center justify-between gap-3 mb-4">
  <div className="flex items-center gap-3 flex-wrap">
    <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide">De</span>
    <input
      type="date"
      value={dataInicio}
      onChange={(e) => setDataInicio(e.target.value)}
      className="input w-auto text-sm"
    />
    <span className="text-stone-400 dark:text-stone-500 text-sm">até</span>
    <input
      type="date"
      value={dataFim}
      onChange={(e) => setDataFim(e.target.value)}
      className="input w-auto text-sm"
    />
    {loadingResumos && (
      <div className="w-4 h-4 border-2 border-stone-300 dark:border-stone-600 border-t-stone-600 dark:border-t-stone-300 rounded-full animate-spin" />
    )}
  </div>
  {isAdminGeral && (
    <button
      onClick={() => abrirPdf(
        `/relatorios/geral?dataInicio=${dataInicio}&dataFim=${dataFim}`,
        `relatorio_geral_${dataInicio}_${dataFim}.pdf`
      )}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-600 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
    >
      <FileDown size={13} />
      Relatório Geral PDF
    </button>
  )}
</div>
```

- [ ] **Step 7: Atualizar query string do botão PDF individual de cada continuação**

No card de continuação, localize o botão PDF interno e substitua o `periodo` pela query de datas:

```jsx
// ANTES:
abrirPdf(
  `/relatorios/continuacao/${c.id}?periodo=${periodo}`,
  `relatorio_${c.nome?.replace(/\s+/g, '_')}_${periodo}.pdf`
)
```

```jsx
// DEPOIS:
abrirPdf(
  `/relatorios/continuacao/${c.id}?dataInicio=${dataInicio}&dataFim=${dataFim}`,
  `relatorio_${c.nome?.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.pdf`
)
```

- [ ] **Step 8: Atualizar `abrirDetalheCrianca` — remover referência a `periodo`**

A função `abrirDetalheCrianca` ainda usa `periodo` na query do histórico. Substitua:

```js
// ANTES:
api.get(`/criancas/${id}/historico?periodo=${periodo}`),
```

```js
// DEPOIS:
api.get(`/criancas/${id}/historico?dataInicio=${dataInicio}&dataFim=${dataFim}`),
```

- [ ] **Step 9: Remover spinner de `loadingResumos` duplicado**

Com o spinner movido para a linha de controles no Step 6, remova o bloco standalone abaixo do gráfico que mostra apenas o spinner de loading:

```jsx
// REMOVER este bloco inteiro:
{loadingResumos && (
  <div className="card p-5 mb-6 flex items-center justify-center h-32">
    <div className="w-6 h-6 border-2 border-stone-200 dark:border-stone-700 border-t-stone-500 dark:border-t-stone-400 rounded-full animate-spin" />
  </div>
)}
```

- [ ] **Step 10: Verificar no browser**

Com `npm run dev` no diretório `frontend/`:

1. Abrir `http://localhost:5173` e ir ao Dashboard → aba Resumo.
2. Confirmar que aparecem dois date inputs (`De` / `até`) no lugar dos botões.
3. Alterar uma das datas e verificar que os cards e o gráfico atualizam após ~500 ms.
4. Confirmar que o `labelPeriodo` nos cards mostra `DD/MM/AAAA – DD/MM/AAAA`.
5. Confirmar que o modal de detalhe de continuação exibe o label de período correto.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat(dashboard): seletor de período livre no Resumo (date inputs)"
```
