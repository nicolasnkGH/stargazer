const CACHE_NAME = 'stargazer-cache-v8';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/ai_stargazer_mascot.png',
  './assets/2k_sun.jpg',
  './assets/2k_earth_daymap.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // For API calls, always go to the network first
  if (url.pathname.startsWith('/api') || url.pathname.includes('/targets') || url.pathname.includes('/tonight') || url.pathname.includes('/iss') || url.pathname.includes('/seeing')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

// For static assets, Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});

// ── Web Push Notifications ──────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'StarGazer Alert';
    const options = {
      body: data.body || 'New celestial event!',
      icon: './assets/ai_stargazer_mascot.png',
      badge: './assets/ai_stargazer_mascot.png',
      vibrate: [200, 100, 200],
      data: data.url || '/'
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('Push event payload not JSON', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
