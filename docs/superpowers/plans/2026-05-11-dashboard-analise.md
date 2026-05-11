# Dashboard — Aba Análise Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar aba "Análise" ao Dashboard com séries temporais de presença (semanal) e visitas (mensal) por continuação, seletor de período personalizado e cards de resumo colados ao lado de cada gráfico.

**Architecture:** Novo endpoint `GET /api/dashboard/serie-temporal` agrega presença por semana e visitas por mês por continuação, respeitando o scoping de acesso do usuário. No frontend, um componente `DashboardAnalise.jsx` encapsula toda a lógica da aba — `Dashboard.jsx` ganha apenas controle de abas e o import. Recharts já está instalado (`^3.8.1`).

**Tech Stack:** Node.js + Prisma + MariaDB (backend), React 18 + Recharts + TailwindCSS (frontend)

---

### Task 1: Backend — helpers de data e função `serieTemporal` no service

**Files:**
- Modify: `src/modules/dashboard/dashboard.service.js`

- [ ] **Step 1:** Adicionar helpers `getSemanas` e `getMeses` antes do `module.exports` em `dashboard.service.js`:

```javascript
const getSemanas = (inicio, fim) => {
  const semanas = [];
  const d = new Date(inicio);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); // ajusta para segunda-feira
  while (d <= fim) {
    semanas.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return semanas;
};

const getMeses = (inicio, fim) => {
  const meses = [];
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  while (d <= fim) {
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() + 1);
  }
  return meses;
};
```

- [ ] **Step 2:** Adicionar a função `serieTemporal` após os helpers, antes do `module.exports`:

```javascript
const serieTemporal = async ({ dataInicio, dataFim }, usuario) => {
  const inicio = new Date(dataInicio + 'T00:00:00');
  const fim    = new Date(dataFim   + 'T23:59:59');

  const continuacoes = await prisma.continuacao.findMany({
    where: usuario.todasContinuacoes ? {} : { id: { in: usuario.continuacoes } },
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' },
  });

  // ids de crianças ativas por continuação
  const criancasPorCont = {};
  for (const cont of continuacoes) {
    const rows = await prisma.crianca.findMany({
      where: { continuacaoId: cont.id, ativo: true },
      select: { id: true },
    });
    criancasPorCont[cont.id] = rows.map((r) => r.id);
  }
  const todosIds = Object.values(criancasPorCont).flat();

  // presencas no período
  const presencas = await prisma.presenca.findMany({
    where: { criancaId: { in: todosIds }, data: { gte: inicio, lte: fim } },
    select: { criancaId: true, data: true, status: true },
  });

  // visitas no período
  const visitas = await prisma.visita.findMany({
    where: {
      data: { gte: inicio, lte: fim },
      crianca: { continuacaoId: { in: continuacoes.map((c) => c.id) }, ativo: true },
    },
    select: { data: true, status: true, crianca: { select: { continuacaoId: true } } },
  });

  // série presença por semana
  const semanasDate = getSemanas(inicio, fim);
  const semanasStr  = semanasDate.map((d) => d.toISOString().slice(0, 10));

  const seriesPresenca = continuacoes.map((cont) => {
    const ids = new Set(criancasPorCont[cont.id]);
    const pontos = semanasDate.map((semIni) => {
      const semFim = new Date(semIni);
      semFim.setDate(semFim.getDate() + 6);
      semFim.setHours(23, 59, 59);
      const regs = presencas.filter(
        (p) => ids.has(p.criancaId) && p.data >= semIni && p.data <= semFim
      );
      if (regs.length === 0) return null;
      const pres = regs.filter((p) => p.status === 'presente').length;
      return Math.round((pres / regs.length) * 100);
    });
    return { continuacaoId: cont.id, nome: cont.nome, pontos };
  });

  // série visitas por mês
  const meses = getMeses(inicio, fim);

  const seriesVisitas = continuacoes.map((cont) => {
    const pontos = meses.map((mes) => {
      const [ano, mesNum] = mes.split('-').map(Number);
      return visitas.filter(
        (v) =>
          v.crianca.continuacaoId === cont.id &&
          v.status === 'concluida' &&
          v.data.getFullYear() === ano &&
          v.data.getMonth() + 1 === mesNum
      ).length;
    });
    return { continuacaoId: cont.id, nome: cont.nome, pontos };
  });

  // resumo totais do período
  const resumoPresenca = continuacoes.map((cont) => {
    const ids          = new Set(criancasPorCont[cont.id]);
    const regs         = presencas.filter((p) => ids.has(p.criancaId));
    const presentes    = regs.filter((p) => p.status === 'presente').length;
    const ausentes     = regs.filter((p) => p.status === 'ausente').length;
    const justificados = regs.filter((p) => p.status === 'justificado').length;
    const total        = regs.length;
    return {
      continuacaoId: cont.id,
      nome: cont.nome,
      percPresenca: total === 0 ? 0 : Math.round((presentes / total) * 100),
      presentes,
      ausentes,
      justificados,
    };
  });

  const resumoVisitas = continuacoes.map((cont) => {
    const vs = visitas.filter((v) => v.crianca.continuacaoId === cont.id);
    return {
      continuacaoId: cont.id,
      nome:          cont.nome,
      concluidas:    vs.filter((v) => v.status === 'concluida').length,
      pendentes:     vs.filter((v) => v.status === 'pendente').length,
      remarcadas:    vs.filter((v) => v.status === 'remarcada').length,
    };
  });

  return {
    presenca: { semanas: semanasStr, series: seriesPresenca },
    visitas:  { meses,               series: seriesVisitas  },
    resumo:   { presenca: resumoPresenca, visitas: resumoVisitas },
  };
};
```

- [ ] **Step 3:** Atualizar o `module.exports` no final do arquivo:

```javascript
module.exports = { resumoContinuacao, aniversariantesMes, faltasNoPeriodo, serieTemporal };
```

- [ ] **Step 4:** Commit:

```bash
git add src/modules/dashboard/dashboard.service.js
git commit -m "feat(dashboard): serieTemporal — presença semanal e visitas mensais por continuação"
```

---

### Task 2: Backend — controller e rota

**Files:**
- Modify: `src/modules/dashboard/dashboard.controller.js`
- Modify: `src/modules/dashboard/dashboard.routes.js`

- [ ] **Step 1:** Substituir o conteúdo completo de `dashboard.controller.js` por:

```javascript
const service = require('./dashboard.service');

const resumoContinuacao = async (req, res) => {
  const data = await service.resumoContinuacao(req.params.continuacaoId, req.query, req.usuario);
  res.json(data);
};

const aniversariantes = async (req, res) => {
  const data = await service.aniversariantesMes(req.query, req.usuario);
  res.json(data);
};

const faltasNoPeriodo = async (req, res) => {
  const data = await service.faltasNoPeriodo(req.query, req.usuario);
  res.json(data);
};

const serieTemporal = async (req, res, next) => {
  try {
    const { dataInicio, dataFim } = req.query;
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });
    }
    const data = await service.serieTemporal({ dataInicio, dataFim }, req.usuario);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { resumoContinuacao, aniversariantes, faltasNoPeriodo, serieTemporal };
```

- [ ] **Step 2:** Adicionar a nova rota em `dashboard.routes.js` após as rotas existentes, antes de `module.exports`:

```javascript
// GET /api/dashboard/serie-temporal?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
router.get('/serie-temporal', controller.serieTemporal);
```

- [ ] **Step 3:** Testar o endpoint com o servidor rodando (`npm run dev` na raiz):

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ccb.com","password":"Admin@123"}' | jq -r '.token')

curl -s "http://localhost:3000/api/dashboard/serie-temporal?dataInicio=2026-01-01&dataFim=2026-05-11" \
  -H "Authorization: Bearer $TOKEN" | jq '{semanas: .presenca.semanas | length, series: (.presenca.series | map(.nome))}'
```

Esperado: objeto com `semanas` (número de semanas no período) e `series` (array com nomes das continuações).

- [ ] **Step 4:** Commit:

```bash
git add src/modules/dashboard/dashboard.controller.js src/modules/dashboard/dashboard.routes.js
git commit -m "feat(dashboard): GET /api/dashboard/serie-temporal"
```

---

### Task 3: Frontend — componente DashboardAnalise

**Files:**
- Create: `frontend/src/components/DashboardAnalise.jsx`

- [ ] **Step 1:** Criar `frontend/src/components/DashboardAnalise.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import api from '../api/client'
import { useTheme } from '../contexts/ThemeContext'

const CORES = ['#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6']

const toISO = (d) => d.toISOString().slice(0, 10)

const defaultInicio = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  return toISO(d)
}

export default function DashboardAnalise() {
  const { dark } = useTheme()
  const [dataInicio, setDataInicio] = useState(defaultInicio)
  const [dataFim,    setDataFim]    = useState(() => toISO(new Date()))
  const [dados,      setDados]      = useState(null)
  const [loading,    setLoading]    = useState(false)

  const tooltipStyle = {
    backgroundColor: dark ? '#1c1917' : '#fff',
    border: `1px solid ${dark ? '#44403c' : '#e7e5e4'}`,
    borderRadius: '8px',
    fontSize: '12px',
    color: dark ? '#f5f5f4' : '#1c1917',
  }
  const axisColor = dark ? '#78716c' : '#a8a29e'
  const gridColor = dark ? '#292524' : '#f5f4f1'

  const carregar = useCallback(async (ini, fim) => {
    if (!ini || !fim || ini > fim) return
    setLoading(true)
    try {
      const res = await api.get(`/dashboard/serie-temporal?dataInicio=${ini}&dataFim=${fim}`)
      setDados(res.data)
    } catch {
      // silencioso — não quebra a página
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => carregar(dataInicio, dataFim), 500)
    return () => clearTimeout(t)
  }, [dataInicio, dataFim, carregar])

  // transforma series em formato Recharts: [{label, 'Nome Cont': valor, ...}]
  const buildData = (eixo, series) => {
    if (!eixo?.length || !series?.length) return []
    return eixo.map((label, i) => {
      const entry = { label }
      series.forEach((s) => { entry[s.nome] = s.pontos[i] ?? null })
      return entry
    })
  }

  const presencaData = dados ? buildData(dados.presenca.semanas, dados.presenca.series) : []
  const visitasData  = dados ? buildData(dados.visitas.meses,    dados.visitas.series)  : []
  const series       = dados?.presenca.series ?? []

  const fmtSemana = (v) => {
    if (!v) return ''
    const d = new Date(v + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }
  const fmtMes = (v) => {
    if (!v) return ''
    const [ano, mes] = v.split('-')
    return new Date(Number(ano), Number(mes) - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
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
        {loading && (
          <div className="w-4 h-4 border-2 border-stone-300 dark:border-stone-600 border-t-stone-600 dark:border-t-stone-300 rounded-full animate-spin" />
        )}
      </div>

      {!dados && !loading && (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-8">
          Selecione um período para carregar os dados.
        </p>
      )}

      {dados && (
        <>
          {/* ── PRESENÇA ─────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-3">
              Presença por Continuação
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="card p-4 flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">Evolução de Presença</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">% semanal por continuação</p>
                {presencaData.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-8">Sem registros no período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={presencaData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickFormatter={fmtSemana}
                        tick={{ fontSize: 10, fill: axisColor }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 10, fill: axisColor }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v, name) => [v !== null ? `${v}%` : '—', name]}
                        labelFormatter={fmtSemana}
                      />
                      {series.map((s, i) => (
                        <Line
                          key={s.continuacaoId}
                          type="monotone"
                          dataKey={s.nome}
                          stroke={CORES[i % CORES.length]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: CORES[i % CORES.length] }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Cards presença */}
              <div className="flex flex-row md:flex-col gap-2 md:w-52 flex-wrap md:flex-nowrap">
                {dados.resumo.presenca.map((r, i) => {
                  const cor = CORES[i % CORES.length]
                  return (
                    <div
                      key={r.continuacaoId}
                      className="card p-3 flex-1 md:flex-none"
                      style={{ borderLeft: `3px solid ${cor}` }}
                    >
                      <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
                        {r.nome}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xl font-extrabold" style={{ color: cor }}>
                          {r.percPresenca}%
                        </span>
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-xs">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.presentes}</span>
                            <span className="text-stone-400 dark:text-stone-500 ml-1">pres.</span>
                          </span>
                          <span className="text-xs">
                            <span className="font-bold text-red-500 dark:text-red-400">{r.ausentes}</span>
                            <span className="text-stone-400 dark:text-stone-500 ml-1">falta</span>
                          </span>
                          <span className="text-xs">
                            <span className="font-bold text-amber-500 dark:text-amber-400">{r.justificados}</span>
                            <span className="text-stone-400 dark:text-stone-500 ml-1">just.</span>
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${r.percPresenca}%`, backgroundColor: cor }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── VISITAS ──────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-3">
              Visitas Concluídas por Continuação
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="card p-4 flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-1">Evolução de Visitas</p>
                <p className="text-xs text-stone-400 dark:text-stone-500 mb-4">Visitas concluídas por mês</p>
                {visitasData.length === 0 ? (
                  <p className="text-sm text-stone-400 text-center py-8">Sem visitas no período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={visitasData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tickFormatter={fmtMes}
                        tick={{ fontSize: 10, fill: axisColor }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: axisColor }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(v, name) => [v, name]}
                        labelFormatter={fmtMes}
                      />
                      {series.map((s, i) => (
                        <Line
                          key={s.continuacaoId}
                          type="monotone"
                          dataKey={s.nome}
                          stroke={CORES[i % CORES.length]}
                          strokeWidth={2}
                          dot={{ r: 3, fill: CORES[i % CORES.length] }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Cards visitas */}
              <div className="flex flex-row md:flex-col gap-2 md:w-52 flex-wrap md:flex-nowrap">
                {dados.resumo.visitas.map((r, i) => {
                  const cor = CORES[i % CORES.length]
                  return (
                    <div
                      key={r.continuacaoId}
                      className="card p-3 flex-1 md:flex-none"
                      style={{ borderLeft: `3px solid ${cor}` }}
                    >
                      <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
                        {r.nome}
                      </p>
                      <div className="flex flex-col gap-1">
                        {[
                          { label: 'Concluídas', val: r.concluidas, cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' },
                          { label: 'Pendentes',  val: r.pendentes,  cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'   },
                          { label: 'Remarcadas', val: r.remarcadas, cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' },
                        ].map((item) => (
                          <div key={item.label} className="flex justify-between items-center">
                            <span className="text-xs text-stone-400 dark:text-stone-500">{item.label}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.cls}`}>
                              {item.val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2:** Commit:

```bash
git add frontend/src/components/DashboardAnalise.jsx
git commit -m "feat(dashboard): componente DashboardAnalise — gráficos de linha + cards laterais"
```

---

### Task 4: Frontend — abas no Dashboard.jsx

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1:** Adicionar import do componente no topo de `Dashboard.jsx` (após os imports existentes):

```jsx
import DashboardAnalise from '../components/DashboardAnalise'
```

- [ ] **Step 2:** Adicionar estado de aba logo após `const [loadingCrianca, setLoadingCrianca] = useState(false)`:

```jsx
const [aba, setAba] = useState('resumo')
```

- [ ] **Step 3:** Adicionar as abas no JSX logo após o bloco `{/* Header */}` (após o `</div>` que fecha o header), antes do seletor de período:

```jsx
{/* Abas */}
<div className="flex border-b border-stone-100 dark:border-stone-700 mb-4">
  {[
    { v: 'resumo',  l: 'Resumo'  },
    { v: 'analise', l: 'Análise' },
  ].map((a) => (
    <button
      key={a.v}
      onClick={() => setAba(a.v)}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        aba === a.v
          ? 'border-stone-800 dark:border-stone-200 text-stone-800 dark:text-stone-100'
          : 'border-transparent text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
      }`}
    >
      {a.l}
    </button>
  ))}
</div>
```

- [ ] **Step 4:** Envolver todo o conteúdo da aba Resumo (do seletor de período até os atalhos, inclusive) com `{aba === 'resumo' && (...)}`. O bloco começa em `{/* Seletor de período + botão PDF */}` e termina após `{/* Atalhos */}`. Adicionar logo após a aba Análise:

```jsx
{aba === 'analise' && <DashboardAnalise />}
```

A estrutura final do JSX principal (entre os modais) deve ser:

```jsx
{/* Header */}
<div className="mb-6">...</div>

{/* Abas */}
<div className="flex border-b ...">...</div>

{aba === 'resumo' && (
  <>
    {/* Seletor de período + botão PDF */}
    ...
    {/* Cards das continuações */}
    ...
    {/* Gráfico comparativo */}
    ...
    {/* Alertas + Aniversariantes */}
    ...
    {/* Atalhos */}
    ...
  </>
)}

{aba === 'analise' && <DashboardAnalise />}
```

- [ ] **Step 5:** Commit:

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat(dashboard): abas Resumo / Análise"
```

---

### Task 5: Build e deploy Docker

**Files:** nenhum arquivo novo

- [ ] **Step 1:** Verificar build sem erros:

```bash
cd /Users/guylherme.miguel/code/precenca-ccb/frontend && npm run build 2>&1 | tail -5
```

Esperado: `✓ built in X.XXs` sem linhas de erro.

- [ ] **Step 2:** Rebuild e subir containers:

```bash
cd /Users/guylherme.miguel/code/precenca-ccb && docker-compose up --build
```

Esperado: `Container ccb_frontend Started`, `Container ccb_app Started`.

- [ ] **Step 3:** Validar em `http://localhost:8080`:
  - Dashboard abre normalmente
  - Aba **Resumo** exibe o conteúdo anterior sem regressão
  - Aba **Análise** exibe seletor de datas, dois gráficos de linha e cards laterais
  - Hover nos pontos exibe tooltip com valores de todas as continuações
  - Mudar as datas dispara nova requisição (spinner aparece) e gráficos atualizam
  - Operador vê apenas as continuações acessíveis a ele
