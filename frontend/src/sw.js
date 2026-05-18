// Injetado pelo vite-plugin-pwa (vazio — usamos cache manual)
const _manifest = (self.__WB_MANIFEST = [])

// Bump esta versao quando trocar icones ou outros assets de URL estavel
const CACHE = 'ccb-v2-rjm'
const PRECACHE = ['/', '/offline']
// Icones tem URL estavel — forcamos fetch sem cache HTTP no install
const PRECACHE_NOCACHE = [
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-192.png?v=2-rjm',
  '/pwa-512.png?v=2-rjm',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(async (cache) => {
        await cache.addAll(PRECACHE)
        // Bypass do HTTP cache para garantir versao nova dos icones
        await Promise.all(
          PRECACHE_NOCACHE.map(async (url) => {
            try {
              const res = await fetch(url, { cache: 'reload' })
              if (res.ok) await cache.put(url, res)
            } catch (_) { /* ignora falha individual */ }
          })
        )
      })
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
          }).catch(() => new Response('', { status: 408, statusText: 'Offline' }))
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
  event.respondWith(
    fetch(request).catch(async () => (await caches.match(request)) ?? new Response('', { status: 503 }))
  )
})
