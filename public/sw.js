const CACHE_NAME = 'billstracker-pwa-v11';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Skip local XAMPP API calls so live sync works normally
  if (request.url.includes('api.php') || request.url.includes(':8080')) {
    return;
  }

  // Block dotfile / sensitive path probes (e.g. /.env, /.git) from falling back to index.html
  try {
    const parsedUrl = new URL(request.url);
    if (parsedUrl.pathname.includes('/.') || parsedUrl.pathname.endsWith('.env')) {
      event.respondWith(
        new Response('403 Forbidden — Access Denied', {
          status: 403,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      );
      return;
    }
  } catch {
    // ignore URL parse error
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});

