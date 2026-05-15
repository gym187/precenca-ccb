# PWA — SW + Cache + Offline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o service worker vazio do CCB por um SW customizado com cache de assets, fallback offline e página `/offline`, espelhando a arquitetura do finance-app.

**Architecture:** Usa `vite-plugin-pwa` com `strategies: 'injectManifest'` para processar `src/sw.js` customizado (em vez de gerar um SW Workbox vazio). O SW é registrado manualmente em `main.jsx`. O manifest continua sendo gerado pelo plugin com ícones em entradas separadas (`purpose: 'any'` e `purpose: 'maskable'`).

**Tech Stack:** Vite 5, vite-plugin-pwa, React 18, React Router 6, TailwindCSS, lucide-react.

---

## File Map

| Arquivo | Ação |
|---|---|
| `frontend/vite.config.js` | Modify — `strategies: 'injectManifest'`, `injectRegister: null`, ícones separados |
| `frontend/src/sw.js` | Create — SW customizado com cache-first/network-first |
| `frontend/src/pages/Offline.jsx` | Create — página offline |
| `frontend/src/App.jsx` | Modify — rota `/offline` fora do PrivateRoute |
| `frontend/src/main.jsx` | Modify — registrar SW manualmente |

---

## Task 1: vite.config.js + src/sw.js

**Files:**
- Modify: `frontend/vite.config.js`
- Create: `frontend/src/sw.js`

**Contexto:** O `vite.config.js` atual usa `strategies` padrão (`generateSW`) com `globPatterns: []` — gera um SW Workbox sem cache. Precisamos mudar para `strategies: 'injectManifest'` para que o plugin processe nosso SW customizado em vez de gerar o próprio. O campo `injectManifest.globPatterns: []` instrui o plugin a injetar `self.__WB_MANIFEST` como array vazio (sem precache automático — gerenciamos o cache manualmente). O `injectRegister: null` desativa o registro automático pelo plugin — faremos isso em `main.jsx` na Task 3.

Os ícones do manifest são separados em 3 entradas (padrão correto para Chrome Android reconhecer como app, não atalho).

- [ ] **Step 1: Substituir vite.config.js**

Substituir o conteúdo completo de `frontend/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: null,
      injectManifest: {
        globPatterns: [],
      },
      manifest: {
        name: 'CCB — Controle de Presenças',
        short_name: 'CCB Presenças',
        description: 'Sistema de controle de presença de jovens e menores da CCB',
        start_url: '/',
        display: 'standalone',
        background_color: '#1c1917',
        theme_color: '#1c1917',
        lang: 'pt-BR',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 2: Criar frontend/src/sw.js**

Criar `frontend/src/sw.js`:

```js
// Injetado pelo vite-plugin-pwa (vazio — usamos cache manual)
const _manifest = self.__WB_MANIFEST

const CACHE = 'ccb-v1'
const PRECACHE = ['/', '/offline']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora non-GET e cross-origin (chamadas de API passam direto)
  if (request.method !== 'GET' || url.origin !== location.origin) return

  // Assets do Vite: cache-first (têm hash no nome, nunca mudam de URL)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone()
            caches.open(CACHE).then((c) => c.put(request, clone))
            return res
          })
      )
    )
    return
  }

  // Navegação: network-first com fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
          return res
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match('/offline')
        })
    )
    return
  }

  // Resto: network-first simples
  event.respondWith(fetch(request).catch(() => caches.match(request)))
})
```

- [ ] **Step 3: Verificar que o build passa**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb/frontend
npm run build
```

Esperado: build sem erros. Verificar que `dist/sw.js` existe e contém o fetch handler:

```bash
grep -c 'addEventListener' dist/sw.js
```

Esperado: número ≥ 3 (install, activate, fetch).

- [ ] **Step 4: Commit**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb
git add frontend/vite.config.js frontend/src/sw.js
git commit -m "feat(pwa): SW customizado com cache-first/network-first via injectManifest"
```

---

## Task 2: Página Offline + Rota

**Files:**
- Create: `frontend/src/pages/Offline.jsx`
- Modify: `frontend/src/App.jsx`

**Contexto:** A página `/offline` precisa estar **fora** do `PrivateRoute` — o usuário pode não estar autenticado quando ficar offline, e o SW redireciona para ela sem passar pelo React Router autenticado. Adicionar a rota antes do catch-all `*` em `App.jsx`.

O arquivo `App.jsx` atual tem a estrutura:
```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route element={<PrivateRoute />}>
    <Route element={<Layout />}>
      ...rotas autenticadas...
    </Route>
  </Route>
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

- [ ] **Step 1: Criar frontend/src/pages/Offline.jsx**

```jsx
import { WifiOff } from 'lucide-react'

export default function Offline() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gelo dark:bg-stone-950 px-4">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <WifiOff size={48} className="text-stone-400 dark:text-stone-500" />
        </div>
        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">
          Sem conexão
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mb-6">
          Verifique sua internet e tente novamente.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Atualizar App.jsx**

Adicionar o import de `Offline` e a rota `/offline`. Substituir o conteúdo completo de `frontend/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Toast from './components/Toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Criancas from './pages/Criancas'
import Presencas from './pages/Presencas'
import Continuacoes from './pages/Continuacoes'
import Usuarios from './pages/Usuarios'
import Relatorios from './pages/Relatorios'
import Visitas from './pages/Visitas'
import Offline from './pages/Offline'

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Toast />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/offline" element={<Offline />} />
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/criancas" element={<Criancas />} />
                <Route path="/presencas" element={<Presencas />} />
                <Route path="/continuacoes" element={<Continuacoes />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/visitas" element={<Visitas />} />
                <Route path="/usuarios" element={<Usuarios />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 3: Verificar rota manualmente**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb/frontend
npm run dev
```

Abrir `http://localhost:5173/offline` no browser. Esperado: página "Sem conexão" com ícone WifiOff e botão "Tentar novamente" — sem redirecionar para login.

Fechar o servidor dev após verificar.

- [ ] **Step 4: Commit**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb
git add frontend/src/pages/Offline.jsx frontend/src/App.jsx
git commit -m "feat(pwa): pagina offline e rota /offline publica"
```

---

## Task 3: Registrar SW em main.jsx + Build Final

**Files:**
- Modify: `frontend/src/main.jsx`

**Contexto:** Com `injectRegister: null` no vite-plugin-pwa, o registro do SW não acontece automaticamente — precisamos fazer manualmente. O registro deve acontecer antes de `ReactDOM.createRoot` para o SW começar a interceptar fetch o mais cedo possível. O `catch(() => {})` silencia erros em browsers sem suporte (ou em localhost sem HTTPS).

- [ ] **Step 1: Atualizar main.jsx**

Substituir o conteúdo completo de `frontend/src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 2: Build de produção final**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb/frontend
npm run build
```

Esperado: build sem erros. Verificar arquivos gerados:

```bash
ls dist/sw.js dist/manifest.webmanifest
```

Esperado: ambos existem.

Verificar que o manifest tem 3 entradas de ícones:

```bash
grep -c '"purpose"' dist/manifest.webmanifest
```

Esperado: `3`.

- [ ] **Step 3: Commit**

```bash
cd /Users/guylherme.miguel/code/precenca-ccb
git add frontend/src/main.jsx
git commit -m "feat(pwa): registrar SW manualmente em main.jsx"
```

- [ ] **Step 4: Push**

```bash
git push origin main
```

---

## Verificação no celular (após deploy)

1. Abrir o app no Chrome Android
2. DevTools → Application → Service Workers — confirmar que `/sw.js` está ativo
3. DevTools → Application → Cache Storage — confirmar que `ccb-v1` existe com `'/'` e `'/offline'`
4. Desligar o Wi-Fi e recarregar — deve aparecer a página "Sem conexão"
5. Reinstalar o PWA pelo banner (uninstall o atalho anterior, reinstalar) — ícone deve aparecer sem badge do Chrome
