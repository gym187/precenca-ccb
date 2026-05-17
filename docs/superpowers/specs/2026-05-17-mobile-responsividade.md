# Spec — Responsividade Mobile

**Data:** 2026-05-17  
**Status:** Aprovado

## Problema

As tabelas nas páginas principais escondem colunas em telas < 640px via `hidden sm:table-cell`, `hidden md:table-cell`, `hidden lg:table-cell`. No celular o usuário vê apenas Nome + Ações — Continuação, Responsável, Telefone, Data, Endereço, Email ficam completamente invisíveis.

Problemas secundários também identificados:
- Padding `p-6` em todas as páginas — excessivo em telas pequenas
- Sem suporte a safe-area-inset do iOS (notch, home indicator)
- `index.html` sem meta tags PWA para iOS (`apple-mobile-web-app-capable` etc.)
- `InstallBanner` fixo no rodapé sem `padding-bottom` compensatório no conteúdo

## Solução

**Padrão para todas as páginas com tabela:** renderizar dois blocos dentro do mesmo `card`:
1. `<div className="block sm:hidden">` — lista de cards mobile com todos os campos visíveis
2. `<div className="hidden sm:block">` — tabela original sem nenhuma alteração

Desktop fica 100% idêntico ao atual.

## Cards por página

### Criancas.jsx
Cada card exibe:
- Linha 1: Avatar + Nome (bold) + badge de continuação à direita
- Linha 2 (grid 2 col): Responsável | Telefone  
- Linha 3 (botões): WhatsApp · Editar · Arquivar (ou Ver Detalhe para arquivados)
- Na aba Arquivados: campo "Motivo" em vez dos botões de ação de ativos

### Visitas.jsx
Cada card exibe:
- Linha 1: Nome da criança (bold) + continuação em sub-texto + badge de status à direita
- Linha 2 (grid 2 col): Data e hora | Responsável
- Linha 3 (span full): Endereço
- Linha 4 (botões): Editar · Remover

### Usuarios.jsx
Cada card exibe:
- Linha 1: Avatar com inicial + Nome (bold) + email em sub-texto
- Linha 2: badges de roles (já visíveis no desktop, mantém aqui)
- Linha 3 (botões): Continuações · Role · Remover

### Continuacoes.jsx
Cada card exibe:
- Linha 1: Nome (bold) + badge "N jovens" à direita
- Linha 2: Auxiliares (texto, ou "—" se nenhum)
- Linha 3 (botões): Editar · Remover

## Fixes adicionais

### Padding responsivo
Todas as páginas passam de `p-6` para `px-4 py-4 sm:p-6`. Reduz o desperdício de espaço lateral no mobile sem afetar desktop.

### Safe-area-inset iOS
- `index.html`: adicionar `viewport-fit=cover` na meta viewport
- `index.html`: adicionar `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`
- `index.css body`: adicionar `padding-bottom: env(safe-area-inset-bottom)` para o home indicator do iPhone
- `InstallBanner`: altura do banner considerada no padding-bottom do `main`

### InstallBanner spacing
O `main` em `Layout.jsx` não tem padding-bottom para compensar o banner fixo. Quando o banner está visível, conteúdo no rodapé fica escondido. Solução: adicionar `pb-16` ao `main` quando o banner estiver visível (via context ou CSS simples).

Como o `InstallBanner` só aparece em mobile Android/iOS, o fix é:
- `Layout.jsx`: adicionar `pb-16 sm:pb-0` ao `<main>` (16 = altura aprox. do banner). O banner só aparece em mobile, então no desktop não tem efeito.

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `frontend/index.html` | Meta tags PWA iOS + `viewport-fit=cover` |
| `frontend/src/index.css` | safe-area-inset-bottom no body |
| `frontend/src/components/Layout.jsx` | `pb-16 sm:pb-0` no `<main>` |
| `frontend/src/pages/Criancas.jsx` | Cards mobile dentro do card existente |
| `frontend/src/pages/Visitas.jsx` | Cards mobile dentro do card existente |
| `frontend/src/pages/Usuarios.jsx` | Cards mobile dentro do card existente |
| `frontend/src/pages/Continuacoes.jsx` | Cards mobile dentro do card existente |

## Não muda

- Nenhum componente compartilhado (Modal, Sidebar, Layout estrutural)
- Nenhuma lógica de negócio
- Desktop layout idêntico ao atual
- SW, manifest, e lógica PWA
