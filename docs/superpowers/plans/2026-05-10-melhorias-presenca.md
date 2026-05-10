# Melhorias Presenca-CCB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 5 melhorias no precenca-ccb: fix N+1 em faltas, aviso de presença já lançada, busca por nome, botão WhatsApp, e export CSV.

**Architecture:** Backend Node.js/Express com Prisma — seguir o padrão existente (service → controller → routes). Frontend React 18 com Vite/TailwindCSS — editar páginas existentes sem criar novos arquivos. Sem alterações de schema.

**Tech Stack:** Node.js, Express, Prisma (MariaDB), React 18, TailwindCSS, lucide-react, Axios

---

## File Map

| Arquivo | Mudança |
|---------|---------|
| `src/modules/dashboard/dashboard.service.js` | Substituir `faltasConsecutivas` por `faltasNoPeriodo` — 2 queries fixas |
| `src/modules/dashboard/dashboard.controller.js` | Renomear handler |
| `src/modules/dashboard/dashboard.routes.js` | Atualizar referência do handler |
| `src/modules/presencas/presenca.service.js` | Adicionar `listarDatas` |
| `src/modules/presencas/presenca.controller.js` | Adicionar `getDatas` |
| `src/modules/presencas/presenca.routes.js` | Adicionar `GET /datas` |
| `src/modules/relatorios/relatorio.service.js` | Adicionar `gerarCsv` |
| `src/modules/relatorios/relatorio.controller.js` | Adicionar `csv` handler |
| `src/modules/relatorios/relatorio.routes.js` | Adicionar `GET /csv` |
| `frontend/src/pages/Dashboard.jsx` | Rename field + minFaltas=3 + botão WhatsApp |
| `frontend/src/pages/Presencas.jsx` | Busca por nome + aviso + lista de datas |
| `frontend/src/pages/Relatorios.jsx` | Botão exportar CSV |

---

## Task 1: Fix N+1 — `faltasNoPeriodo` (backend)

**Files:**
- Modify: `src/modules/dashboard/dashboard.service.js`
- Modify: `src/modules/dashboard/dashboard.controller.js`
- Modify: `src/modules/dashboard/dashboard.routes.js`

- [ ] **Step 1: Substituir a função `faltasConsecutivas` inteira em `dashboard.service.js`**

Apagar a função existente (linhas 122–166) e adicionar no lugar:

```js
const faltasNoPeriodo = async ({ continuacaoId, minFaltas = 3 } = {}, usuario) => {
  const where = { ativo: true };
  if (continuacaoId) {
    if (usuario && !usuario.todasContinuacoes && !usuario.continuacoes.includes(continuacaoId)) {
      throw new AppError('Sem acesso a esta continuação.', 403);
    }
    where.continuacaoId = continuacaoId;
  } else if (usuario && !usuario.todasContinuacoes) {
    where.continuacaoId = { in: usuario.continuacoes };
  }

  const criancas = await prisma.crianca.findMany({
    where,
    select: {
      id: true,
      nomeCompleto: true,
      nomeResponsavel: true,
      telefoneResponsavel: true,
      continuacao: { select: { nome: true } },
    },
  });

  if (criancas.length === 0) return [];

  const inicio30d = new Date();
  inicio30d.setDate(inicio30d.getDate() - 30);

  const faltas = await prisma.presenca.findMany({
    where: {
      criancaId: { in: criancas.map((c) => c.id) },
      data: { gte: inicio30d },
      status: { not: 'presente' },
    },
    select: { criancaId: true },
  });

  const contagemFaltas = {};
  for (const f of faltas) {
    contagemFaltas[f.criancaId] = (contagemFaltas[f.criancaId] ?? 0) + 1;
  }

  return criancas
    .filter((c) => (contagemFaltas[c.id] ?? 0) >= Number(minFaltas))
    .map((c) => ({ ...c, faltasNoPeriodo: contagemFaltas[c.id] }))
    .sort((a, b) => b.faltasNoPeriodo - a.faltasNoPeriodo);
};
```

Atualizar o `module.exports` na última linha do arquivo:
```js
module.exports = { resumoContinuacao, aniversariantesMes, faltasNoPeriodo };
```

- [ ] **Step 2: Atualizar `dashboard.controller.js`**

Substituir o arquivo inteiro por:

```js
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

module.exports = { resumoContinuacao, aniversariantes, faltasNoPeriodo };
```

- [ ] **Step 3: Atualizar `dashboard.routes.js`**

Substituir linha `router.get('/faltas-consecutivas', controller.faltasConsecutivas)` por:
```js
router.get('/faltas-consecutivas', controller.faltasNoPeriodo);
```

- [ ] **Step 4: Verificar manualmente**

Subir o servidor: `npm run dev` na raiz do projeto.

Testar: `curl -H "Authorization: Bearer <token>" http://localhost:3000/api/dashboard/faltas-consecutivas`

Esperado: array de objetos com campo `faltasNoPeriodo` (não mais `faltasConsecutivas`), apenas crianças com ≥3 faltas nos últimos 30 dias.

- [ ] **Step 5: Commit**

```bash
git add src/modules/dashboard/dashboard.service.js src/modules/dashboard/dashboard.controller.js src/modules/dashboard/dashboard.routes.js
git commit -m "perf: corrige N+1 em faltas — 2 queries fixas, janela 30 dias, threshold 3"
```

---

## Task 2: Atualizar Dashboard.jsx — rename + WhatsApp

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Atualizar fetch e campo `faltasConsecutivas` → `faltasNoPeriodo`**

Na linha 78, mudar `minFaltas=2` para `minFaltas=3`:
```js
api.get('/dashboard/faltas-consecutivas?minFaltas=3'),
```

Na linha 4, adicionar `MessageCircle` ao import do lucide-react:
```js
import { Baby, AlertTriangle, Cake, Building2, ArrowRight, FileDown, MessageCircle } from 'lucide-react'
```

- [ ] **Step 2: Atualizar o card de alertas de faltas**

Localizar o bloco de renderização de cada item de `faltas` (por volta da linha 320–337). Substituir o bloco inteiro do `faltas.map(...)` por:

```jsx
faltas.map((c) => {
  const telLimpo = (c.telefoneResponsavel ?? '').replace(/\D/g, '')
  const msgWpp = encodeURIComponent(
    `Paz de Deus ${c.nomeResponsavel} sou auxiliar da ${c.nomeCompleto}, podemos conversar?`
  )
  const linkWpp = `https://wa.me/55${telLimpo}?text=${msgWpp}`

  return (
    <div
      key={c.id}
      className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer transition-colors"
      onClick={() => abrirDetalheCrianca(c.id)}
    >
      <div>
        <p className="text-sm font-medium text-stone-700 dark:text-stone-200">{c.nomeCompleto}</p>
        <p className="text-xs text-stone-400 dark:text-stone-500">{c.continuacao?.nome}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-xs font-semibold">
          {c.faltasNoPeriodo} falta(s)
        </span>
        {telLimpo && (
          <a
            href={linkWpp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Enviar WhatsApp"
            className="text-emerald-500 hover:text-emerald-600 transition-colors"
          >
            <MessageCircle size={16} />
          </a>
        )}
      </div>
    </div>
  )
})
```

- [ ] **Step 3: Atualizar texto do estado vazio**

Linha com `"Nenhuma falta consecutiva registrada."`, alterar para:
```jsx
Nenhuma falta registrada nos últimos 30 dias.
```

- [ ] **Step 4: Verificar no browser**

Abrir `http://localhost:8080/dashboard`. Confirmar:
- Card de alertas mostra `X falta(s)` (campo `faltasNoPeriodo`)
- Ícone de WhatsApp aparece ao lado de crianças com telefone
- Clicar no ícone abre `wa.me` em nova aba com mensagem pré-preenchida
- Clicar no ícone não abre o modal de detalhe da criança (stopPropagation)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: botão WhatsApp em alertas de faltas + atualiza campo faltasNoPeriodo"
```

---

## Task 3: Backend — endpoint `GET /api/presencas/datas`

**Files:**
- Modify: `src/modules/presencas/presenca.service.js`
- Modify: `src/modules/presencas/presenca.controller.js`
- Modify: `src/modules/presencas/presenca.routes.js`

- [ ] **Step 1: Adicionar `listarDatas` em `presenca.service.js`**

Antes do `module.exports` no final do arquivo, adicionar:

```js
const listarDatas = async ({ continuacaoId } = {}, usuario) => {
  if (!continuacaoId) throw new AppError('continuacaoId é obrigatório.', 400);

  if (usuario && !usuario.todasContinuacoes && !usuario.continuacoes.includes(continuacaoId)) {
    throw new AppError('Sem acesso a esta continuação.', 403);
  }

  const criancas = await prisma.crianca.findMany({
    where: { continuacaoId },
    select: { id: true },
  });
  const ids = criancas.map((c) => c.id);

  if (ids.length === 0) return [];

  const grupos = await prisma.presenca.groupBy({
    by: ['data'],
    where: { criancaId: { in: ids } },
    _count: { id: true },
    orderBy: { data: 'desc' },
  });

  return grupos.map((g) => ({
    data: g.data.toISOString().slice(0, 10),
    total: g._count.id,
  }));
};
```

Atualizar `module.exports`:
```js
module.exports = { lancarLista, editar, listar, buscarAuditoria, listarDatas };
```

- [ ] **Step 2: Adicionar `getDatas` em `presenca.controller.js`**

Antes do `module.exports`:
```js
const getDatas = async (req, res) => {
  const data = await service.listarDatas(req.query, req.usuario);
  res.json(data);
};
```

Atualizar `module.exports`:
```js
module.exports = { lancarLista, editar, listar, auditoria, getDatas };
```

- [ ] **Step 3: Adicionar rota em `presenca.routes.js`**

Adicionar **antes** das rotas com `/:id` (para evitar que "datas" seja interpretado como um ID):

```js
// GET /api/presencas/datas — datas com lançamento por continuação
router.get('/datas', perm('lancar_presenca'), controller.getDatas);
```

O arquivo final das rotas deve ter esta ordem:
1. `POST /lista`
2. `GET /` (listar)
3. `GET /datas` ← nova, antes das rotas com `:id`
4. `PUT /:id`
5. `GET /:id/auditoria`

- [ ] **Step 4: Verificar manualmente**

`curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/presencas/datas?continuacaoId=<id>"`

Esperado:
```json
[
  { "data": "2026-05-04", "total": 12 },
  { "data": "2026-04-27", "total": 11 }
]
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/presencas/presenca.service.js src/modules/presencas/presenca.controller.js src/modules/presencas/presenca.routes.js
git commit -m "feat: endpoint GET /presencas/datas — histórico de datas lançadas por continuação"
```

---

## Task 4: Frontend — Presencas.jsx (aviso + datas + busca)

**Files:**
- Modify: `frontend/src/pages/Presencas.jsx`

- [ ] **Step 1: Adicionar states e fetch de datas**

No bloco de estados (após `const [notaGeral, setNotaGeral]`), adicionar:
```js
const [datasLancadas, setDatasLancadas] = useState([]) // [{ data: 'YYYY-MM-DD', total: N }]
const [busca, setBusca] = useState('')
```

Adicionar novo `useEffect` após o `useEffect` existente que carrega continuações:
```js
useEffect(() => {
  if (!continuacaoId) { setDatasLancadas([]); return }
  api.get(`/presencas/datas?continuacaoId=${continuacaoId}`)
    .then((r) => setDatasLancadas(r.data))
    .catch(() => setDatasLancadas([]))
}, [continuacaoId])
```

- [ ] **Step 2: Resetar `busca` ao recarregar lista**

Na função `carregarLista`, após `setCarregado(true)`, adicionar:
```js
setBusca('')
```

- [ ] **Step 3: Derivar `criancasFiltradas` e verificar se data já foi lançada**

Logo antes do `return (`, adicionar:
```js
const criancasFiltradas = criancas.filter((c) =>
  c.nomeCompleto.toLowerCase().includes(busca.toLowerCase())
)

const dataJaLancada = datasLancadas.some((d) => d.data === data)
const ultimas5Datas = datasLancadas.slice(0, 5)
```

- [ ] **Step 4: Adicionar painel de últimas datas e badge de aviso**

No bloco de controles (o `<div className="card p-5 mb-5">`), após o `</div>` que fecha o `flex flex-wrap gap-3 items-end`, adicionar:

```jsx
{ultimas5Datas.length > 0 && (
  <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
    <span className="text-xs text-stone-400">Últimos lançamentos:</span>
    {ultimas5Datas.map((d) => (
      <button
        key={d.data}
        type="button"
        onClick={() => { setData(d.data); setCarregado(false) }}
        className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${
          d.data === data
            ? 'bg-amber-100 border-amber-300 text-amber-700 font-semibold'
            : 'bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-400'
        }`}
      >
        {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
      </button>
    ))}
  </div>
)}
```

No botão "Carregar lista", adicionar o badge de aviso ao lado. Localizar:
```jsx
<button
  onClick={carregarLista}
  disabled={loading}
  className="btn-secondary h-[38px]"
>
```

Envolver o botão e adicionar o badge numa `<div className="flex items-center gap-2">`:
```jsx
<div className="flex items-center gap-2">
  <button
    onClick={carregarLista}
    disabled={loading}
    className="btn-secondary h-[38px]"
  >
    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
    {loading ? 'Carregando...' : 'Carregar lista'}
  </button>
  {dataJaLancada && carregado && (
    <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 font-medium">
      Editando — presença já lançada
    </span>
  )}
</div>
```

- [ ] **Step 5: Adicionar input de busca**

Logo após o bloco `{carregado && criancas.length > 0 && (`, antes do `{/* Resumo */}`, adicionar:

```jsx
{/* Busca por nome */}
<div className="mb-3">
  <input
    type="text"
    placeholder="Filtrar por nome..."
    value={busca}
    onChange={(e) => setBusca(e.target.value)}
    className="input w-full max-w-xs"
  />
</div>
```

- [ ] **Step 6: Trocar `criancas` por `criancasFiltradas` na renderização**

Na lista de crianças, localizar:
```jsx
{criancas.map((c, idx) => (
```
Trocar por:
```jsx
{criancasFiltradas.map((c, idx) => (
```

Também atualizar o botão de envio para mostrar o total real:
```jsx
{enviando ? 'Enviando...' : `Confirmar presença (${criancas.length} jovens/menores)`}
```
(manter `criancas.length` aqui, não `criancasFiltradas.length` — o envio é sempre de todos, não só dos filtrados)

- [ ] **Step 7: Verificar no browser**

1. Selecionar continuação → chips de datas aparecem abaixo dos controles
2. Clicar num chip → campo de data é preenchido
3. Carregar lista em data já lançada → badge âmbar "Editando — presença já lançada" aparece
4. Digitar no campo busca → lista filtra em tempo real sem nova chamada de rede
5. Clicar "Carregar lista" → campo busca é limpo

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Presencas.jsx
git commit -m "feat: busca por nome, aviso de presença já lançada e histórico de datas"
```

---

## Task 5: Backend — Export CSV

**Files:**
- Modify: `src/modules/relatorios/relatorio.service.js`
- Modify: `src/modules/relatorios/relatorio.controller.js`
- Modify: `src/modules/relatorios/relatorio.routes.js`

- [ ] **Step 1: Adicionar `gerarCsv` em `relatorio.service.js`**

Antes do `module.exports`, adicionar:

```js
const gerarCsv = async (continuacaoId, { periodo } = {}, usuario, res) => {
  if (
    usuario &&
    !usuario.todasContinuacoes &&
    !usuario.continuacoes.includes(continuacaoId)
  ) {
    res.status(403).json({ erro: 'Sem acesso a esta continuação.' });
    return;
  }

  const intervalo = resolverIntervalo({ periodo });
  const dados = await dadosContinuacao(continuacaoId, intervalo);
  if (!dados) {
    res.status(404).json({ erro: 'Continuação não encontrada.' });
    return;
  }

  const nomeSanitizado = dados.continuacao.nome.replace(/[^a-z0-9]/gi, '_');
  const periodoLabel = labelPeriodo(periodo).replace(/ /g, '_');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="presencas_${nomeSanitizado}_${periodoLabel}.csv"`
  );

  const escapar = (v) => `"${String(v).replace(/"/g, '""')}"`;

  const header = 'Nome,Continuação,Presenças,Faltas,Justificados,Total,% Presença\n';
  const linhas = dados.linhas.map((l) =>
    [
      escapar(l.nomeCompleto),
      escapar(dados.continuacao.nome),
      l.presentes,
      l.ausentes,
      l.justificados,
      l.total,
      l.perc,
    ].join(',')
  );

  res.send(header + linhas.join('\n'));
};
```

Atualizar `module.exports`:
```js
module.exports = { gerarPdfContinuacao, gerarPdfGeral, gerarPdfAdministrativo, gerarCsv };
```

- [ ] **Step 2: Adicionar handler `csv` em `relatorio.controller.js`**

Atualizar o import na primeira linha:
```js
const { gerarPdfContinuacao, gerarPdfGeral, gerarPdfAdministrativo, gerarCsv } = require('./relatorio.service');
```

Antes do `module.exports`, adicionar:
```js
const csv = async (req, res, next) => {
  try {
    const { continuacaoId, periodo } = req.query;
    if (!continuacaoId) {
      return res.status(400).json({ erro: 'continuacaoId é obrigatório.' });
    }
    await gerarCsv(continuacaoId, { periodo }, req.usuario, res);
  } catch (err) {
    next(err);
  }
};
```

Atualizar `module.exports`:
```js
module.exports = { continuacao, geral, administrativo, csv };
```

- [ ] **Step 3: Adicionar rota em `relatorio.routes.js`**

```js
router.get('/csv', auth, perm('visualizar_dashboard'), ctrl.csv);
```

Arquivo final:
```js
const router = require('express').Router();
const ctrl = require('./relatorio.controller');
const auth = require('../../middleware/auth');
const perm = require('../../middleware/permission');

router.get('/geral', auth, ctrl.geral);
router.get('/administrativo', auth, perm('visualizar_dashboard'), ctrl.administrativo);
router.get('/continuacao/:id', auth, perm('visualizar_dashboard'), ctrl.continuacao);
router.get('/csv', auth, perm('visualizar_dashboard'), ctrl.csv);

module.exports = router;
```

- [ ] **Step 4: Verificar manualmente**

`curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/relatorios/csv?continuacaoId=<id>&periodo=1m" -o presencas.csv`

Abrir o arquivo e confirmar:
- Header: `Nome,Continuação,Presenças,Faltas,Justificados,Total,% Presença`
- Uma linha por criança ativa da continuação
- Nomes com aspas e vírgulas escapados corretamente

- [ ] **Step 5: Commit**

```bash
git add src/modules/relatorios/relatorio.service.js src/modules/relatorios/relatorio.controller.js src/modules/relatorios/relatorio.routes.js
git commit -m "feat: endpoint GET /relatorios/csv — exportar presença por continuação"
```

---

## Task 6: Frontend — botão CSV em Relatorios.jsx

**Files:**
- Modify: `frontend/src/pages/Relatorios.jsx`

- [ ] **Step 1: Adicionar função `baixarCsv`**

Logo após a função `baixarPdf` (linha 23), adicionar:

```js
async function baixarCsv(url, nomeArquivo) {
  const res = await api.get(url, { responseType: 'blob' })
  const href = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = href
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(href)
}
```

- [ ] **Step 2: Adicionar handler e botão CSV no bloco "Por continuação"**

Na função `baixar`, adicionar o caso `csv` no bloco `if/else`:

```js
} else if (tipo === 'csv') {
  if (!contSelecionada) return
  const nome = continuacoes.find((c) => c.id === contSelecionada)?.nome ?? 'continuacao'
  const nomeSlug = nome.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const data = new Date().toISOString().slice(0, 10)
  await baixarCsv(
    `/relatorios/csv?continuacaoId=${contSelecionada}&periodo=${periodo}`,
    `presencas_${nomeSlug}_${data}.csv`
  )
}
```

No bloco "Por continuação" (`div` com `<p>Por continuação</p>`), adicionar um segundo botão ao lado do existente. Trocar o `<BotaoDownload>` único por um `<div className="flex gap-2">` com dois botões:

```jsx
<div className="flex gap-2 flex-wrap">
  <BotaoDownload loading={loading.continuacao} onClick={() => baixar('continuacao')}>
    Baixar PDF
  </BotaoDownload>
  <BotaoDownload loading={loading.csv} onClick={() => baixar('csv')} variante="secondary">
    Exportar CSV
  </BotaoDownload>
</div>
```

- [ ] **Step 3: Adicionar prop `variante` ao componente `BotaoDownload`**

Atualizar o componente no final do arquivo:

```jsx
function BotaoDownload({ loading, onClick, children, variante = 'primary' }) {
  const estilos = variante === 'secondary'
    ? 'bg-white text-stone-700 border border-stone-200 hover:border-stone-400'
    : 'bg-stone-900 text-white hover:bg-stone-700'
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${estilos}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Verificar no browser**

1. Abrir `http://localhost:8080/relatorios`
2. Selecionar uma continuação e período
3. Clicar "Exportar CSV" → arquivo baixa com nome `presencas_<nome>_<data>.csv`
4. Abrir no Excel/Google Sheets → colunas corretas, dados formatados
5. Clicar "Baixar PDF" → ainda funciona normalmente (regressão)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Relatorios.jsx
git commit -m "feat: botão exportar CSV na página de relatórios"
```

---

## Verificação Final

- [ ] Subir todos os containers: `docker-compose up --build`
- [ ] Confirmar que `/api/health` responde `{ status: 'ok' }`
- [ ] Testar golden path completo: login → dashboard (alertas com WhatsApp) → presença (busca + datas + badge) → relatórios (CSV)
- [ ] Confirmar que relatórios PDF existentes não regridem
