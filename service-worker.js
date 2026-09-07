/* Fall of the Foul — offline app shell cache */
var CACHE = "fotf-v4";
var ASSETS = [
  ".",
  "index.html",
  "manifest.webmanifest",
  "js/data.js",
  "js/state.js",
  "js/art.js",
  "js/ui.js",
  "js/arena.js",
  "js/main.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-32.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).catch(function () {}));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { try { c.put(e.request, copy); } catch (x) {} });
        return res;
      }).catch(function () { return caches.match("index.html"); });
    })
  );
});
