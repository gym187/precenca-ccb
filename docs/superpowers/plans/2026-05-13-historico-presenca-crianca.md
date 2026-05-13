# Histórico de Presença Individual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar aba "Histórico" no Modal Detalhe da tela de Jovens e Menores, com filtro de período livre e resumo de presenças/ausências/justificadas.

**Architecture:** O endpoint `GET /api/criancas/:id/historico` já existe e já suporta `dataInicio`/`dataFim` como query params — nenhuma nova rota é necessária. A única mudança de backend é ajustar a permissão do endpoint de `visualizar_dashboard` para `gerenciar_criancas` (inconsistência atual). O trabalho principal é no frontend: adicionar tabs ao Modal Detalhe existente em `Criancas.jsx` e implementar a aba Histórico com date picker e lista de registros.

**Tech Stack:** Node.js/Express, React 18, TailwindCSS, Axios, lucide-react

---

## File Map

| Arquivo | Mudança |
|---|---|
| `src/modules/criancas/crianca.routes.js` | Linha 22: trocar `perm('visualizar_dashboard')` por `perm('gerenciar_criancas')` |
| `frontend/src/pages/Criancas.jsx` | Adicionar 5 states, 1 função, e reescrever o bloco do Modal Detalhe com tabs |

---

## Task 1: Corrigir permissão do endpoint histórico (backend)

**Files:**
- Modify: `src/modules/criancas/crianca.routes.js` (linha 22)

**Contexto:** O endpoint `/:id/historico` exige `perm('visualizar_dashboard')`, mas é acessado a partir da tela de Jovens e Menores que requer `gerenciar_criancas`. Um operador com `gerenciar_criancas` sem `visualizar_dashboard` recebe 403 ao abrir o histórico — bug silencioso existente.

- [ ] **Step 1: Alterar permissão na rota**

No arquivo `src/modules/criancas/crianca.routes.js`, linha 22, trocar:
```js
router.get(
  '/:id/historico',
  perm('visualizar_dashboard'),
  validate(filtroHistoricoSchema, 'query'),
  controller.historico
);
```
Por:
```js
router.get(
  '/:id/historico',
  perm('gerenciar_criancas'),
  validate(filtroHistoricoSchema, 'query'),
  controller.historico
);
```

- [ ] **Step 2: Verificar manualmente**

Subir o servidor com `npm run dev` na raiz.

Testar com token de usuário que tem `gerenciar_criancas` mas não `visualizar_dashboard`:
```
GET /api/criancas/<id>/historico?dataInicio=2026-04-01&dataFim=2026-05-13
```
Esperado: 200 com `{ historico: [...], estatisticas: { ... } }`.

Se não tiver esse usuário disponível, testar com o admin e confirmar 200.

- [ ] **Step 3: Commit**

```bash
git add src/modules/criancas/crianca.routes.js
git commit -m "fix(criancas): permissao de historico alinhada com gerenciar_criancas"
```

---

## Task 2: Aba Histórico no Modal Detalhe (frontend)

**Files:**
- Modify: `frontend/src/pages/Criancas.jsx`

**Contexto:** O Modal Detalhe (abre ao clicar no nome de uma criança) atualmente mostra dados read-only e tem um botão "Ver histórico" que fecha o modal e abre o Modal Histórico separado. A mudança transforma esse modal em dois tabs: "Detalhes" (conteúdo atual) e "Histórico" (novo). O botão "Ver histórico" no footer é removido pois a funcionalidade passa a ser a aba. O Modal Histórico separado (acessível pelo ícone de relógio na lista) continua existindo e não é alterado.

O endpoint a usar é o existente:
```
GET /api/criancas/:id/historico?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
```
Resposta:
```json
{
  "historico": [{ "id": "...", "data": "...", "status": "presente|ausente|justificado", "observacao": null }],
  "estatisticas": { "total": 12, "presentes": 8, "ausentes": 3, "justificados": 1 }
}
```

- [ ] **Step 1: Adicionar 5 novos states**

Após a linha `const [detalhe, setDetalhe] = useState(null)` (linha 69 do arquivo atual), inserir:

```js
const [abaDetalhe, setAbaDetalhe] = useState('dados')
const [detalheHistorico, setDetalheHistorico] = useState(null)
const [detalheLoadingHistorico, setDetalheLoadingHistorico] = useState(false)
const [detalheDataInicio, setDetalheDataInicio] = useState(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
)
const [detalheDataFim, setDetalheDataFim] = useState(
  new Date().toISOString().slice(0, 10)
)
```

- [ ] **Step 2: Adicionar função `buscarHistoricoDetalhe`**

Após a função `toggleFiltroStatus` (por volta da linha 260), inserir:

```js
const buscarHistoricoDetalhe = async (criancaId) => {
  setDetalheLoadingHistorico(true)
  try {
    const res = await api.get(`/criancas/${criancaId}/historico`, {
      params: { dataInicio: detalheDataInicio, dataFim: detalheDataFim },
    })
    setDetalheHistorico(res.data)
  } catch {
    error('Erro ao buscar histórico.')
  } finally {
    setDetalheLoadingHistorico(false)
  }
}
```

- [ ] **Step 3: Substituir o bloco completo do Modal Detalhe**

Localizar o bloco `{/* Modal Detalhe */}` (começa em `{detalhe && (`, linha ~858) até o `)}` que fecha o Modal. Substituir inteiro por:

```jsx
{/* Modal Detalhe */}
{detalhe && (
  <Modal
    title={`Detalhe — ${detalhe.nomeCompleto}`}
    onClose={() => {
      setDetalhe(null)
      setAbaDetalhe('dados')
      setDetalheHistorico(null)
    }}
    size="lg"
  >
    {/* Tabs */}
    <div className="flex border-b border-stone-200 dark:border-stone-700 mb-4 -mt-2">
      <button
        type="button"
        onClick={() => setAbaDetalhe('dados')}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          abaDetalhe === 'dados'
            ? 'border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100'
            : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
        }`}
      >
        Detalhes
      </button>
      <button
        type="button"
        onClick={() => {
          setAbaDetalhe('historico')
          if (!detalheHistorico) buscarHistoricoDetalhe(detalhe.id)
        }}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          abaDetalhe === 'historico'
            ? 'border-stone-900 text-stone-900 dark:border-stone-100 dark:text-stone-100'
            : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
        }`}
      >
        Histórico
      </button>
    </div>

    {abaDetalhe === 'dados' ? (
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <AvatarWithFallback foto={detalhe.foto} nome={detalhe.nomeCompleto} size="lg" />
          <div className="flex-1 space-y-1">
            <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">{detalhe.nomeCompleto}</p>
            <p className="text-sm text-stone-500">
              {detalhe.continuacao?.nome ?? todasContinuacoes.find((x) => x.id === detalhe.continuacaoId)?.nome}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-stone-400 uppercase font-semibold mb-0.5">Data de nascimento</p>
            <p className="text-stone-700 dark:text-stone-300">
              {detalhe.dataNascimento
                ? new Date(detalhe.dataNascimento.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-400 uppercase font-semibold mb-0.5">Responsável</p>
            <p className="text-stone-700 dark:text-stone-300">{detalhe.nomeResponsavel}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 uppercase font-semibold mb-0.5">Telefone do responsável</p>
            <p className="text-stone-700 dark:text-stone-300">{detalhe.telefoneResponsavel}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 uppercase font-semibold mb-0.5">Telefone da criança</p>
            <p className="text-stone-700 dark:text-stone-300">{detalhe.telefoneCrianca || '—'}</p>
          </div>
        </div>

        {detalhe.descricao && (
          <div>
            <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Descrição</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap bg-stone-50 dark:bg-stone-800 rounded-lg p-3">{detalhe.descricao}</p>
          </div>
        )}

        {detalhe.observacao && (
          <div>
            <p className="text-xs text-stone-400 uppercase font-semibold mb-1">Observação</p>
            <p className="text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">{detalhe.observacao}</p>
          </div>
        )}

        {temPermissao('gerenciar_criancas') && (
          <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-700">
            <button
              type="button"
              onClick={() => { abrirEditar(detalhe); setDetalhe(null); setAbaDetalhe('dados'); setDetalheHistorico(null) }}
              className="btn-primary"
            >
              <Pencil size={14} /> Editar
            </button>
          </div>
        )}
      </div>
    ) : (
      <div>
        {/* Filtro de período */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="label">De</label>
            <input
              type="date"
              className="input"
              value={detalheDataInicio}
              max={detalheDataFim}
              onChange={(e) => setDetalheDataInicio(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="label">Até</label>
            <input
              type="date"
              className="input"
              value={detalheDataFim}
              min={detalheDataInicio}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDetalheDataFim(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn-secondary self-end"
            onClick={() => buscarHistoricoDetalhe(detalhe.id)}
            disabled={detalheLoadingHistorico}
          >
            Buscar
          </button>
        </div>

        {detalheLoadingHistorico && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
          </div>
        )}

        {!detalheLoadingHistorico && detalheHistorico && (
          <>
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold text-emerald-600">{detalheHistorico.estatisticas.presentes}</p>
                <p className="text-xs text-stone-400">Presenças</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold text-red-500">{detalheHistorico.estatisticas.ausentes}</p>
                <p className="text-xs text-stone-400">Ausências</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold text-amber-600">{detalheHistorico.estatisticas.justificados}</p>
                <p className="text-xs text-stone-400">Justificadas</p>
              </div>
            </div>

            {/* Lista */}
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {detalheHistorico.historico.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-6">Nenhum registro encontrado neste período.</p>
              ) : (
                detalheHistorico.historico.map((p) => (
                  <div
                    key={p.id}
                    className={`py-2.5 px-3 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 ${
                      p.status === 'justificado' ? 'border-l-2 border-amber-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-600 dark:text-stone-400">
                        {new Date(p.data).toLocaleDateString('pt-BR')}
                      </span>
                      <StatusPresenca status={p.status} />
                    </div>
                    {p.observacao && (
                      <div className="flex items-start gap-1.5 mt-1.5">
                        <MessageSquare size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-stone-500 italic">{p.observacao}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {!detalheLoadingHistorico && !detalheHistorico && (
          <p className="text-sm text-stone-400 text-center py-8">
            Selecione o período e clique em Buscar para ver o histórico.
          </p>
        )}
      </div>
    )}
  </Modal>
)}
```

- [ ] **Step 4: Verificar manualmente no browser**

Subir o frontend: `cd frontend && npm run dev`.

Fluxo a testar:
1. Abrir a tela de Jovens e Menores
2. Clicar no nome de uma criança → modal abre na aba "Detalhes" (conteúdo igual ao atual)
3. Clicar na aba "Histórico" → spinner aparece → lista carrega com resumo e registros dos últimos 30 dias
4. Alterar as datas e clicar "Buscar" → lista atualiza
5. Fechar e reabrir o modal → volta para aba "Detalhes", histórico zerado
6. Dark mode: verificar que os cards e badges ficam corretos
7. Criança sem presenças no período: deve mostrar "Nenhum registro encontrado neste período."
8. Botão Editar na aba Detalhes abre o modal de edição normalmente

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Criancas.jsx
git commit -m "feat(criancas): aba Historico no modal de detalhe com filtro de periodo livre"
```
