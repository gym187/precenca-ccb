# Histórico de Presença Individual — Design Spec

**Data:** 2026-05-13
**Status:** Aprovado

---

## Problema

Hoje o sistema mostra crianças com faltas no dashboard, mas não há como visualizar o histórico individual de uma criança ao longo do tempo. Antes de agendar uma visita ou conversar com um responsável, o operador não tem dados concretos sobre o padrão de frequência daquela criança.

## Solução

Adicionar uma aba **"Histórico"** no modal de detalhe da criança (o que abre ao clicar no nome na tela de Jovens e Menores). A aba exibe os registros de presença em ordem decrescente, com filtro de período e resumo de totais.

---

## Backend

### Novo endpoint

```
GET /api/presencas/crianca/:criancaId?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD
```

- **Middleware:** `auth → perm('gerenciar_criancas')`
- **Padrão:** se `dataInicio`/`dataFim` ausentes, aplica janela de 30 dias retroativos a partir de hoje
- **Ordenação:** registros por `data` decrescente

### Resposta

```json
{
  "total": 12,
  "presentes": 8,
  "ausentes": 3,
  "justificados": 1,
  "registros": [
    { "data": "2026-05-10", "status": "presente" },
    { "data": "2026-05-03", "status": "ausente" },
    { "data": "2026-04-26", "status": "justificado" }
  ]
}
```

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/modules/presencas/presenca.service.js` | Nova função `historicoCrianca(criancaId, dataInicio, dataFim)` |
| `src/modules/presencas/presenca.controller.js` | Novo handler `getHistoricoCrianca` |
| `src/modules/presencas/presenca.routes.js` | Nova rota `GET /crianca/:criancaId` |

---

## Frontend

### Estrutura do modal de detalhe

O modal ganha navegação por abas no topo:

```
[ Detalhes ]  [ Histórico ]
```

- **Aba "Detalhes":** conteúdo existente, sem alteração
- **Aba "Histórico":** novo conteúdo descrito abaixo

### Aba Histórico

**Filtro de período:**
- Dois inputs de data: "De" e "Até"
- Pré-preenchidos: `dataInicio = hoje - 30 dias`, `dataFim = hoje`
- Botão "Buscar" dispara a requisição

**Resumo (exibido após a primeira busca):**
- Card com contadores: `X presenças · Y ausências · Z justificadas`

**Lista de registros:**
- Cada linha: data formatada (DD/MM/YYYY) + badge de status
- Badge cores: verde (presente), vermelho (ausente), amarelo (justificado)
- Ordem decrescente (mais recente primeiro)
- Estado vazio: "Nenhum registro encontrado neste período"

**Carregamento:** lazy — a requisição só é feita quando o usuário clica na aba "Histórico" pela primeira vez. Troca de datas + "Buscar" dispara nova requisição.

### Arquivo

| Arquivo | Mudança |
|---|---|
| `frontend/src/pages/Criancas.jsx` | Adicionar tabs ao modal de detalhe + conteúdo da aba Histórico |

---

## Fora de escopo

- Edição de registros de presença a partir desta aba (isso existe em Presenças)
- Exportação do histórico
- Comparação entre crianças
