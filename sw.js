const CACHE = 'recovery-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Receive alarm messages from the page
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_ALARM') {
    // Store alarm time in SW scope
    self._nextAlarm = e.data.nextAlarmAt;
    startAlarmCheck();
  }
});

let _alarmTimer = null;

function startAlarmCheck() {
  if (_alarmTimer) clearTimeout(_alarmTimer);
  const delay = self._nextAlarm - Date.now();
  if (delay <= 0) {
    fireAlarm();
    return;
  }
  _alarmTimer = setTimeout(fireAlarm, delay);
}

function fireAlarm() {
  self.registration.showNotification('💧 Recovery Reminder', {
    body: 'Time to log your fluid intake and urine output!',
    icon: '/icon.png',
    badge: '/icon.png',
    requireInteraction: true,
    tag: 'hourly-reminder',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'log', title: '📝 Log now' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });

  // Schedule next alarm 1 hour from now
  self._nextAlarm = Date.now() + 100;

  // Notify all open clients
  self.clients.matchAll().then(clients => {
    clients.forEach(c => c.postMessage({ type: 'ALARM_FIRED', nextAlarmAt: self._nextAlarm }));
  });

  startAlarmCheck();
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'log' || !e.action) {
    e.waitUntil(
      clients.matchAll({ type: 'window' }).then(cs => {
        if (cs.length) { cs[0].focus(); return; }
        return clients.openWindow('/');
      })
    );
  }
});
