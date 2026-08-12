/* Project S - service worker: cache static assets for fast offline-ish loading. */
var CACHE_NAME = 'project-s-v1';
var ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/api.js',
  './js/app.js',
  './favicon.png',
  './pro-s.jpg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var url = event.request.url;
  if (event.request.method !== 'GET') return;
  if (url.indexOf('docs.google.com') !== -1) return;
  if (url.indexOf('script.google.com') !== -1) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || network;
    })
  );
});
