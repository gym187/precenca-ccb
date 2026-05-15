# PWA — SW + Cache + Offline — Design Spec

**Data:** 2026-05-15
**Status:** Aprovado

---

## Objetivo

Substituir o service worker vazio do CCB (gerado pelo vite-plugin-pwa sem cache) por um SW customizado com estratégias de cache reais e uma página offline, espelhando a arquitetura do finance-app.

---

## Arquitetura

Mantém o vite-plugin-pwa mas muda para `strategies: 'injectManifest'`: em vez de gerar um SW Workbox automaticamente, o plugin processa nosso `src/sw.js` customizado e o emite em `dist/sw.js`. O registro do SW é feito manualmente em `main.jsx` (sem auto-registro pelo plugin). O manifest continua sendo gerado pelo plugin sem alteração no `index.html`.

---

## Service Worker (`frontend/src/sw.js`)

Cache name: `ccb-v1`. Incrementar para `ccb-v2` a cada mudança no SW para forçar atualização.

**Precache no install:** `['/']` e `'/offline'` — garante que a página offline funcione sem rede.

**Estratégias de fetch:**

| Condição | Estratégia |
|---|---|
| `request.method !== 'GET'` ou `url.origin !== location.origin` | Ignorar — API calls passam direto |
| `url.pathname.startsWith('/assets/')` | Cache-first — assets do Vite têm hash no nome e nunca mudam |
| `request.mode === 'navigate'` | Network-first; falha → cache da rota; falha → `/offline` |
| Resto (fontes, ícones, etc.) | Network-first simples com fallback de cache |

**Activate:** limpa caches com nome diferente de `ccb-v1`.

---

## Manifest — ícones

Separar a entrada única `purpose: 'any maskable'` em duas entradas distintas (padrão do finance-app, mais compatível com Chrome):

```json
{ "src": "/pwa-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" }
{ "src": "/pwa-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
{ "src": "/pwa-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
```

---

## Página Offline (`frontend/src/pages/Offline.jsx`)

Rota pública `/offline`, fora do `PrivateRoute`. Tela simples centralizada com ícone WifiOff (lucide-react), título "Sem conexão" e instrução "Verifique sua internet e tente novamente." com botão para tentar novamente (`window.location.reload()`).

Estilo consistente com o restante do app (dark mode, stone palette).

---

## Rota `/offline` no App.jsx

Adicionada **fora** do `PrivateRoute`, antes do catch-all `*`:

```jsx
<Route path="/offline" element={<Offline />} />
<Route path="*" element={<Navigate to="/" replace />} />
```

O SW redireciona para `/offline` quando offline — o React Router renderiza a página sem precisar de autenticação.

---

## Registro do SW em main.jsx

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
```

Adicionado antes de `ReactDOM.createRoot(...)`. O `injectRegister: null` no vite-plugin-pwa desativa o registro automático do plugin.

---

## Arquivos

| Arquivo | Ação |
|---|---|
| `frontend/vite.config.js` | Modify — `strategies: 'injectManifest'`, `injectRegister: null`, ícones separados |
| `frontend/src/sw.js` | Create — SW customizado com cache-first/network-first |
| `frontend/src/main.jsx` | Modify — registrar SW manualmente |
| `frontend/src/pages/Offline.jsx` | Create — página offline |
| `frontend/src/App.jsx` | Modify — rota `/offline` fora do PrivateRoute |

---

## Fora de escopo

- Push notifications (Sub-projeto 2)
- Cache de respostas da API
- Background sync
