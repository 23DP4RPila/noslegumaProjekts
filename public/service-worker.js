const CACHE = 'uzd-v7';
const PRECACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/app.html',
  '/stats.html',
  '/account.html',
  '/admin.html',
  '/styles.css',
  '/js/auth.js',
  '/js/app.js',
  '/js/stats.js',
  '/js/account.js',
  '/js/admin.js',
  '/js/pwa.js',
  '/manifest.json',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req).catch(() => new Response(JSON.stringify({ error: 'Bezsaistē' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
