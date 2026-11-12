/* 健康登记 · Service Worker
   策略：导航请求“网络优先”，联网时永远取最新 HTML（这样我更新版本后，
   你从主屏幕打开或点“检查更新”就能拿到新版）；离线时回退到缓存副本。 */
const CACHE = 'health-tracker-v1';

self.addEventListener('install', e => { self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isNav = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isNav) {
    // 网络优先：先取最新，成功后刷新缓存；失败（离线）回退缓存
    e.respondWith(
      fetch(req).then(res => {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./')))
    );
    return;
  }

  // 其他同源静态资源：缓存优先，回源并缓存
  if (req.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
        return res;
      }))
    );
  }
});
