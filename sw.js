/**
 * Service Worker — Offline Support for Portfolio
 * Caches all assets on first load, serves from cache when offline
 */
const CACHE = 'ag-portfolio-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/js/app.js',
  '/data/portfolio.json',
  '/assets/Arun_Govindgari_Resume.docx'
];

/* Install: cache all core assets */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* Activate: clean up old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch: network first, fall back to cache */
self.addEventListener('fetch', e => {
  // Only handle GET requests for our own origin + CDN fonts/bootstrap
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Clone and cache successful responses
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // For navigation requests, return index.html
          if (e.request.mode === 'navigate') return caches.match('/index.html');
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
