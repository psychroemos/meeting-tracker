/* Service Worker for Assignment Tracker – Bagong Kongregasyon (NC) */
const CACHE_NAME = 'nc-cache-v30';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './lib/tailwind-utilities.css',
  './lib/xlsx.bundle.min.js',
  './lib/jszip.min.js',
  './lib/pdf-lib.min.js',
  './lib/fontkit.umd.min.js',
  './lib/s140-fonts.js',
  './lib/s89-base.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Navigation requests: try network, fall back to cached index.html when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Everything else: cache-first, then network
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      // optionally cache new same-origin GET responses
      if (req.method === 'GET' && resp && resp.status === 200 && resp.type === 'basic') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
      }
      return resp;
    }).catch(() => cached))
  );
});
