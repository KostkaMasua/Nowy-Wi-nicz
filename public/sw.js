// Prosty service worker: po pierwszym otwarciu aplikacja (wraz z mapą i danymi) działa offline.
const CACHE = 'wisnicz-v1'
const CORE = ['./', 'dane/wisnicz.json', 'map/wisnicz-1849.jpg', 'manifest.webmanifest', 'icons/icon-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})
// Sieć najpierw (świeże dane po aktualizacji), cache jako zapas offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return res
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./'))),
  )
})
