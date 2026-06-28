const CACHE_NAME = 'xinyushiguang-v2'
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request

  if (req.method !== 'GET') return

  const url = new URL(req.url)

  if (url.origin !== self.location.origin) return

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        fetch(req).then(netRes => {
          if (netRes && netRes.status === 200) {
            const clone = netRes.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, clone)
            })
          }
        }).catch(() => {})
        return cached
      }

      return fetch(req).then(netRes => {
        if (netRes && netRes.status === 200) {
          const clone = netRes.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, clone)
          })
        }
        return netRes
      }).catch(() => {
        return caches.match('./index.html')
      })
    })
  )
})
