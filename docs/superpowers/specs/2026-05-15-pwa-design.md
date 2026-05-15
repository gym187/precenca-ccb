# PWA — Instalação no Celular — Design Spec

**Data:** 2026-05-15
**Status:** Aprovado

---

## Objetivo

Tornar o sistema CCB instalável como app no celular (Android e iOS) via Progressive Web App. O app requer conexão com a internet para funcionar — sem suporte offline.

---

## Arquitetura

Usa `vite-plugin-pwa` (padrão para Vite) para gerar automaticamente o web app manifest e registrar o service worker via Workbox. O service worker usa estratégia `NetworkOnly` — apenas habilita o prompt de instalação, sem cache offline.

O Nginx precisa de uma regra específica para o `sw.js` com `Cache-Control: no-cache`, pois a regra atual cacheia todos os `.js` por 1 ano (`immutable`), o que quebraria atualizações do service worker.

HTTPS já está garantido via Cloudflare Tunnel — pré-requisito para PWA.

---

## Arquivos

| Arquivo | Ação | Descrição |
|---|---|---|
| `frontend/package.json` | Modify | Adicionar `vite-plugin-pwa` como devDependency |
| `frontend/vite.config.js` | Modify | Adicionar plugin `VitePWA` com manifest e workbox config |
| `frontend/public/pwa-192.png` | Create | Ícone 192×192 px |
| `frontend/public/pwa-512.png` | Create | Ícone 512×512 px |
| `frontend/nginx.conf` | Modify | Adicionar `location = /sw.js` com `Cache-Control: no-cache` |

---

## Web App Manifest

```json
{
  "name": "CCB — Controle de Presenças",
  "short_name": "CCB Presenças",
  "description": "Sistema de controle de presença de jovens e menores da CCB",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1c1917",
  "theme_color": "#1c1917",
  "icons": [
    { "src": "/pwa-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/pwa-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## Service Worker (Workbox)

Estratégia `NetworkOnly` via `generateSW`. Não faz precache de assets de rota — apenas registra o SW para habilitar instalação. `navigateFallback: null` para não interferir com o comportamento SPA quando offline.

```js
VitePWA({
  registerType: 'autoUpdate',
  manifest: { /* acima */ },
  workbox: {
    globPatterns: [],        // sem precache de assets
    navigateFallback: null,  // sem fallback offline
  },
})
```

---

## Nginx

Adicionar antes da regra geral de assets estáticos:

```nginx
location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    expires 0;
}
```

Sem essa regra, o service worker seria cacheado por 1 ano e o app nunca receberia atualizações.

---

## Ícones

Ícone SVG com silhueta de chapel + texto "CCB", fundo `#1c1917` (stone-900). Gerado em PNG 192×192 e 512×512 via script Node.js usando `sharp`. Os arquivos PNG ficam em `frontend/public/` e são copiados pelo Vite no build.

O usuário pode substituir os PNGs por uma imagem real da congregação a qualquer momento sem alterar nenhum código.

---

## Fora de escopo

- Suporte offline (sem cache de dados ou API)
- Push notifications
- Background sync
- Geração automática de ícones a partir de logo — substituição manual dos PNGs
