# Dashboard Resumo — Seletor de Período Livre

**Data:** 2026-05-11
**Status:** Aprovado

## Objetivo

Substituir os botões fixos de período (`1m`, `3m`, `6m`, `12m`, `Tudo`) na aba Resumo do Dashboard por seletores de data livre (`De [date] até [date]`), tornando a experiência consistente com a aba Análise.

## Escopo

- `frontend/src/pages/Dashboard.jsx`
- `src/utils/dateRange.js`

Sem alterações em: controller, routes, aba Análise, Alertas de Faltas, Aniversariantes.

## Design

### Frontend

**Estado:**
- Remove `periodo` (string) e o array `PERIODOS`.
- Adiciona `dataInicio` (padrão: hoje − 1 mês, formato `YYYY-MM-DD`) e `dataFim` (padrão: hoje).
- Debounce de 500 ms nos onChange dos inputs para evitar requests por tecla.

**UI — linha de controles:**
```
De [input type="date"] até [input type="date"]     [Botão PDF]
```
Mesma classe `input` já usada no DashboardAnalise.

**`carregarResumos`:**
- Assinatura muda de `(conts, per)` para `(conts, dataInicio, dataFim)`.
- Query string: `?dataInicio=${dataInicio}&dataFim=${dataFim}`.

**`labelPeriodo`:**
- Passa a exibir as datas no formato `DD/MM/YYYY – DD/MM/YYYY`.
- Usado nos cards de continuação, modal de continuação e modal de criança.

**Efeitos:**
- `useEffect` inicial carrega com os defaults de `dataInicio`/`dataFim`.
- `useEffect` de dependência reage a mudanças em `dataInicio` e `dataFim` (com debounce).

### Backend

**`src/utils/dateRange.js` — `resolverIntervalo`:**
- Adiciona suporte a `dataInicio`/`dataFim` como primeiro caso verificado:
  ```js
  if (dataInicio && dataFim) {
    return {
      inicio: new Date(dataInicio + 'T00:00:00'),
      fim:    new Date(dataFim   + 'T23:59:59'),
    }
  }
  ```
- Lógica existente (`mes`, `trimestre`, `periodo`) mantida inalterada abaixo.

O controller já repassa `req.query` inteiro ao service, então nenhuma outra camada muda.

## Fluxo de dados

```
User altera date input
  → debounce 500ms
    → carregarResumos(conts, dataInicio, dataFim)
      → GET /api/dashboard/continuacao/:id?dataInicio=...&dataFim=...
        → resolverIntervalo({ dataInicio, dataFim }) → { inicio, fim }
          → query Prisma filtrada pelo intervalo
            → response → atualiza resumos no frontend
```

## Fora de escopo

- Atalhos rápidos de período (opção B rejeitada pelo usuário).
- Validação de `dataFim < dataInicio` no frontend (o backend simplesmente retornará zero registros).
- Alteração nos endpoints de Alertas de Faltas e Aniversariantes (janela fixa de 30 dias).
