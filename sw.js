// モギ offline helper: always asks the site for the newest version first (so updates show right away),
// and only falls back to the saved copy when there is no internet.
var CACHE = 'mogi-v1';
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e) {
    var req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    e.respondWith(
        fetch(req, { cache: 'no-cache' }).then(function(res) {
            if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function(c) { c.put(req, copy); }); }
            return res;
        }).catch(function() {
            return caches.match(req).then(function(hit) { return hit || caches.match('./index.html') || caches.match('./'); });
        })
    );
});
