var CACHE_NAME = 'ministry-helper-v1';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Install — cache core assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache first, then network
self.addEventListener('fetch', function(e) {
  // Skip non-GET and map tile requests (always fetch fresh)
  if (e.request.method !== 'GET') return;
  if (e.request.url.indexOf('arcgisonline.com') > -1) return;
  if (e.request.url.indexOf('tile.openstreetmap') > -1) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        // Cache successful responses
        if (response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    }).catch(function() {
      // Offline fallback — return cached index
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});