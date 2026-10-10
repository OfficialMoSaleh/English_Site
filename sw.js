const CACHE_NAME = 'novaspeak-cache-v2026-exam-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './test.html',
  './test.css',
  './test.js',
  './manifest.json',
  './img/Craftwork.png',
  './img/illustrations-clean.png',
  './audio/a1_04.mp3',
  './audio/a1_06.mp3',
  './audio/a2_04.mp3',
  './audio/b1_04.mp3',
  './audio/b1_07.mp3',
  './audio/b2_04.mp3',
  './audio/b2_10.mp3',
  './audio/c1_04.mp3',
  './audio/c1_09.mp3',
  './audio/c2_07.mp3',
  './audio/c2_09.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first with cache fallback strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
