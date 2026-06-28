// Service Worker — Web Push receiver + offline cache
const CACHE = 'recovery-dilara-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Push arrives from the server — show it even if app is fully closed
self.addEventListener('push', e => {
  let data = { title: '💧 Recovery Reminder — Dilara 🥰', body: 'Time to log fluid intake and urine output.' };
  try { if (e.data) data = e.data.json(); } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      requireInteraction: true,
      tag: 'hourly-reminder',
      renotify: true,
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
