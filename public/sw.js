// Aqsat offline cache.
//
// Two rules matter here:
//   1. Never cache Supabase or /api traffic. Serving a stale cloud read from
//      cache makes the app believe it has seen the real cloud, which feeds the
//      sync merge bad input. Those requests must always hit the network and be
//      allowed to fail honestly when offline.
//   2. Next.js build assets under /_next/static/ are content-hashed, so their
//      URL changes whenever the file changes. They are safe to serve cache-first,
//      which is what makes the app open instantly with no connection.
const CACHE = 'aqsat-v3';
const PRECACHE = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', e => {
  // Individual failures must not abort the whole install.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCacheable(req) {
  if (req.method !== 'GET') return false;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return false;   // Supabase, fonts, CDNs
  if (url.pathname.startsWith('/api/')) return false;      // always live
  return true;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (!isCacheable(req)) return;                            // let the network handle it

  const url = new URL(req.url);

  // Immutable build assets: cache-first, so the app shell loads with no network.
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }))
    );
    return;
  }

  // Everything else same-origin: network-first so updates land, cache as backup.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => {
        if (hit) return hit;
        // A navigation with nothing cached for that exact URL still gets the shell.
        if (req.mode === 'navigate') return caches.match('/');
        return Response.error();
      }))
  );
});
