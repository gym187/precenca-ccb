# PWA Install Banner — Design Spec

**Data:** 2026-05-15
**Status:** Aprovado

---

## Objetivo

Exibir um banner flutuante no rodapé do app convidando o usuário a instalar o PWA na tela inicial. O banner some definitivamente ao ser fechado (salvo em `localStorage`) e também após a instalação ser concluída.

---

## Comportamento

| Condição | Banner |
|---|---|
| App já está instalado (`display-mode: standalone`) | Não exibe |
| `localStorage.pwa_banner_dismissed` = `"true"` | Não exibe |
| Android/Chrome: evento `beforeinstallprompt` disponível | Exibe versão com botão "Instalar" |
| iOS (Safari, não-standalone) | Exibe versão com instrução manual |
| Após clicar "Instalar" e concluir | Some automaticamente (evento `appinstalled`) |
| Após clicar "X" | Some e salva `pwa_banner_dismissed = "true"` |

**iOS detection:** `navigator.userAgent` contém `"iPhone"` ou `"iPad"` (ou `"Mac"` com toque habilitado via `navigator.maxTouchPoints > 1`).

---

## UI

Banner fixo no rodapé (`fixed bottom-0 left-0 right-0 z-40`), sobre o conteúdo, com sombra e fundo `stone-900/95` (dark) / `white/95` (light).

**Android/Chrome:**
```
[ 📱 Instale o CCB na sua tela inicial ]  [ Instalar ]  [ X ]
```

**iOS:**
```
[ 📱 Toque em Compartilhar (□↑) e depois "Adicionar à tela inicial" ]  [ X ]
```

Ícone: `Download` do lucide-react (Android) / `Share` do lucide-react (iOS).

---

## Arquitetura

**Novo componente:** `frontend/src/components/InstallBanner.jsx`

Responsabilidades:
- Capturar `beforeinstallprompt` em `useEffect` e guardar em ref
- Detectar iOS
- Verificar `localStorage` e `display-mode: standalone` para decidir se exibe
- Escutar `appinstalled` para ocultar automaticamente
- Expor botão "Instalar" que chama `deferredPrompt.prompt()`
- Botão "X" salva no `localStorage` e oculta

**Integração:** Adicionar `<InstallBanner />` ao final do JSX de `frontend/src/components/Layout.jsx` — aparece apenas para usuários autenticados, nunca na tela de login.

---

## Arquivos

| Arquivo | Ação |
|---|---|
| `frontend/src/components/InstallBanner.jsx` | Create |
| `frontend/src/components/Layout.jsx` | Modify — adicionar `<InstallBanner />` |

---

## Fora de escopo

- Persistência além de `localStorage` (sem backend)
- Lembrar após N dias (some para sempre ou fica para sempre)
- Posição configurável (sempre rodapé)
