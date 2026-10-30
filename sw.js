// モギ offline helper.
// The page itself (index.html) is always asked for fresh, so updates show right away; the big script and style
// files carry a fingerprint in their names and never change once published, so they are kept on the device and
// served from there, and only re-downloaded when a new version has a new name.
var ASSETS = ["glyphs.d5166e4c.js", "ambience.97118656.js", "atmos.c5e2d5c7.js", "app.62b8d08e.js", "explain.ee87b33b.js", "garden.1b2c46c1.js", "gistsync.419c20f9.js", "omikuji.3243c2a2.js", "opening.ba01fa98.js", "styles.fa6f3a8b.css", "town.10196ad1.js"];
var CACHE = 'mogi-' + ASSETS.join('|').length + '-' + ASSETS.map(function(a) { return a.split('.')[1]; }).join('');
var FINGERPRINTED = /\.[0-9a-f]{8}\.(js|css)$/;
var ART = 'mogi-art-1';           // the prints: kept across app updates
self.addEventListener('install', function(e) {
    e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(ASSETS.map(function(a) { return './' + a; })).catch(function() {}); }).then(function() { return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e) {
    e.waitUntil(caches.keys().then(function(keys) {
        return Promise.all(keys.filter(function(k) { return k !== CACHE && k !== ART; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e) {
    var req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
    if (FINGERPRINTED.test(new URL(req.url).pathname)) {
        // a published file never changes: use the saved copy, fetch it once if we don't have it
        e.respondWith(caches.open(CACHE).then(function(c) {
            return c.match(req).then(function(hit) {
                return hit || fetch(req).then(function(res) { if (res && res.ok) c.put(req, res.clone()); return res; });
            });
        }));
        return;
    }
    if (/\/art\/[^/]+\.(webp|jpg)$/.test(new URL(req.url).pathname)) {
        // a print: show the saved copy immediately; check the site in the background so a replaced print shows next time
        e.respondWith(caches.open(ART).then(function(c) {
            return c.match(req).then(function(hit) {
                var net = fetch(req, { cache: 'no-cache' }).then(function(res) { if (res && res.status === 200) c.put(req, res.clone()); return res; });
                if (hit) { e.waitUntil(net.catch(function() {})); return hit; }
                return net;
            });
        }));
        return;
    }
    // the page and the icons: the newest from the site, the saved copy when there is no internet
    e.respondWith(
        fetch(req, { cache: 'no-cache' }).then(function(res) {
            if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE).then(function(c) { return c.put(req, copy); }).catch(function() {}); }
            return res;
        }).catch(function() {
            return caches.match(req).then(function(hit) { return hit || caches.match('./index.html') || caches.match('./'); });
        })
    );
});
