/* 天神祭導航 service worker：快取 app shell + Leaflet + 地圖圖磚（現場網路壅塞時仍可用） */
"use strict";
const VER = 'tenjin-sw-v1';
const TILE_CACHE = VER + '-tiles';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VER && k !== TILE_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const TILE_MAX = 400; // 圖磚快取上限（張）
async function trimTiles(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - TILE_MAX; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 頁面本體：網路優先（部署新版立即生效），失敗時退回快取（離線可開）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone();
        caches.open(VER).then(c => c.put('./index.html', cp));
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 地圖圖磚：快取優先，逛過的區域離線也能顯示
  if (url.hostname.endsWith('basemaps.cartocdn.com')) {
    e.respondWith(caches.open(TILE_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') { c.put(req, r.clone()); trimTiles(c); }
      return r;
    }));
    return;
  }

  // 其餘（Leaflet 等靜態資源）：快取優先
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (url.hostname === 'unpkg.com' && r.ok) {
        const cp = r.clone();
        caches.open(VER).then(c => c.put(req, cp));
      }
      return r;
    }))
  );
});
