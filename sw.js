// Офлайн: всё, что нужно игре, — в кэше. Новая версия — поменять VER, старый кэш удалится.
const VER = 'dp-v12';
const FILES = ['./', 'index.html', 'data.js', 'logic.js', 'game.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'park.jpg', 'dig.jpg', 'dinos/stego.webp', 'dinos/diplo.webp', 'dinos/trex.webp', 'dinos/spino.webp', 'dinos/trike.webp', 'dinos/allo.webp', 'dinos/ankylo.webp', 'dinos/carno.webp', 'dinos/brachio.webp', 'dinos/ptera.webp', 'dinos/compy.webp', 'dinos/iguano.webp', 'dinos/raptor.webp', 'dinos/para.webp', 'dinos/proto.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VER).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))); self.clients.claim(); });
// Сначала из сети, мимо HTTP-кэша браузера (иначе обновление доходит с опозданием), без сети — из кэша.
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(VER).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
