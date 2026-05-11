# Spec: Dashboard — Aba Análise

**Data:** 2026-05-11
**Status:** Aprovado

---

## Visão Geral

Adicionar uma aba **Análise** ao Dashboard existente, expondo séries temporais de presença e visitas por continuação com seletor de período personalizado. Disponível para admin (todas as continuações) e operador (apenas as suas continuações). O layout da aba **Resumo** atual permanece intacto.

---

## Estrutura de Navegação

O Dashboard ganha duas abas no topo:

- **Resumo** — view atual (cards, gráfico de barras comparativo, alertas de faltas, aniversariantes)
- **Análise** — nova view descrita neste spec

---

## Aba Análise — Componentes

### 1. Seletor de Período Personalizado

Dois campos `<input type="date">` — **De** e **Até** — com padrão inicial de 3 meses atrás até hoje. Ambos os gráficos e os cards reagem ao mesmo intervalo ao mudar as datas.

### 2. Gráfico de Presença — Série Temporal

- `LineChart` do Recharts com uma linha por continuação (cor distinta e consistente em toda a página)
- Eixo X: semanas do período selecionado (`YYYY-Www` agrupado pelo primeiro dia da semana)
- Eixo Y: 0–100%, com gridlines em 25/50/75/100
- Todas as linhas partem do mesmo ponto Y (% da primeira semana com registros) e divergem conforme os dados
- Linha tracejada vertical marca o ponto de partida
- Tooltip ao hover: mostra % de presença de **todas** as continuações naquele ponto

### 3. Gráfico de Visitas — Série Temporal

- Mesmo formato do gráfico de presença
- Eixo X: meses do período selecionado
- Eixo Y: quantidade de visitas concluídas (inteiro)
- Todas as linhas partem do mesmo ponto Y (0 visitas no início do período)
- Tooltip ao hover: mostra quantidade de visitas concluídas de todas as continuações naquele mês

### 4. Cards de Presença (lado direito do gráfico de presença)

Um card por continuação, alinhados verticalmente ao lado do gráfico. Cada card contém:
- Nome da continuação
- Porcentagem atual do período em destaque (cor correspondente à linha)
- Mini-stats à direita da porcentagem: presentes (verde), faltas (vermelho), justificadas (amarelo) — contagem total do período
- Barra de progresso na cor da continuação

### 5. Cards de Visitas (lado direito do gráfico de visitas)

Um card por continuação com:
- Nome da continuação
- Badges: concluídas (verde), pendentes (âmbar), remarcadas (índigo) — totais do período

---

## Paleta de Cores por Continuação

Cores atribuídas em ordem de cadastro (estáveis durante a sessão):

| Posição | Cor        | Hex       |
|---------|------------|-----------|
| 1       | Esmeralda  | `#10b981` |
| 2       | Azul       | `#3b82f6` |
| 3       | Violeta    | `#8b5cf6` |
| 4       | Laranja    | `#f97316` |
| 5+      | Repetir    | Cíclico   |

---

## Scoping por Perfil

| Perfil     | Continuações visíveis         |
|------------|-------------------------------|
| ADMIN_GERAL | Todas                        |
| Operador   | Apenas as do `usuario.continuacoes` |

A filtragem acontece no backend — o frontend não precisa filtrar.

---

## Backend — Novo Endpoint

### `GET /api/dashboard/serie-temporal`

**Query params:**
- `dataInicio` — `YYYY-MM-DD` (obrigatório)
- `dataFim` — `YYYY-MM-DD` (obrigatório)

**Autenticação:** JWT + permissão `visualizar_dashboard`

**Resposta:**
```json
{
  "presenca": {
    "semanas": ["2026-02-02", "2026-02-09", "..."],
    "series": [
      {
        "continuacaoId": "uuid",
        "nome": "Cont. A",
        "pontos": [75, 81, 85, 90, 92, 95, 97, 98]
      }
    ]
  },
  "visitas": {
    "meses": ["2026-02", "2026-03", "2026-04", "2026-05"],
    "series": [
      {
        "continuacaoId": "uuid",
        "nome": "Cont. A",
        "pontos": [0, 3, 7, 11]
      }
    ]
  },
  "resumo": {
    "presenca": [
      {
        "continuacaoId": "uuid",
        "nome": "Cont. A",
        "percPresenca": 98,
        "presentes": 142,
        "ausentes": 3,
        "justificados": 1
      }
    ],
    "visitas": [
      {
        "continuacaoId": "uuid",
        "nome": "Cont. A",
        "concluidas": 11,
        "pendentes": 2,
        "remarcadas": 1
      }
    ]
  }
}
```

**Lógica:**
- Filtra criancas pelas continuações acessíveis ao usuário logado
- Agrupa presenças por semana (início da semana = segunda-feira) e calcula % por continuação
- Agrupa visitas concluídas por mês e conta por continuação
- Calcula totais do período para os cards de resumo

---

## Frontend — Estrutura de Arquivos

```
frontend/src/pages/Dashboard.jsx   ← adicionar estado de aba + lógica da aba Análise
```

O componente permanece em um único arquivo. Se ultrapassar ~600 linhas após a adição, extrair a aba Análise para `frontend/src/components/DashboardAnalise.jsx`.

---

## Estados e Fluxo de Dados

```
[dataInicio, dataFim] → GET /api/dashboard/serie-temporal
                      → { presenca, visitas, resumo }
                      → renderiza gráficos + cards
```

- Debounce de 500ms nas mudanças de data para evitar requisições excessivas
- Loading spinner enquanto carrega (reutilizar padrão existente)
- Erro silencioso com estado vazio (sem quebrar a página)

---

## Comportamento Responsivo

- Em telas < 768px: cards de resumo ficam abaixo do gráfico (stacked), não ao lado
- Em telas ≥ 768px: layout side-by-side (gráfico + cards)

---

## Fora do Escopo

- Exportar dados da aba Análise para PDF
- Filtrar por continuação individual dentro da aba
- Comparação com períodos anteriores (ex: mês a mês YoY)
