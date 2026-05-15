// Injetado pelo vite-plugin-pwa (vazio — usamos cache manual)
const _manifest = (self.__WB_MANIFEST = [])

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
