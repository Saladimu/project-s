/* Project S - service worker.
 * Freshness-first: navigations/HTML are network-first (so deploys show up after
 * a single reload), while versioned static assets are cache-first. */
var CACHE_NAME = 'project-s-v4';
var PRECACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/cache.js',
  './js/api.js',
  './js/app.js',
  './favicon.png',
  './pro-s.jpg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE);
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

function isHtmlOrNavigation(request) {
  if (request.mode === 'navigate') return true;
  var accept = request.headers.get('accept') || '';
  if (accept.indexOf('text/html') !== -1) return true;
  var path = new URL(request.url).pathname;
  return path.charAt(path.length - 1) === '/' || /\.html?$/.test(path);
}

function putInCache(request, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    var copy = response.clone();
    caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
  }
}

function networkFirst(request) {
  return fetch(request).then(function (response) {
    putInCache(request, response);
    return response;
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      if (cached) return cached;
      if (isHtmlOrNavigation(request)) return caches.match('./index.html');
      return Response.error();
    });
  });
}

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      putInCache(request, response);
      return response;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = request.url;
  if (request.method !== 'GET') return;
  if (url.indexOf('docs.google.com') !== -1) return;
  if (url.indexOf('script.google.com') !== -1) return;

  var parsed;
  try { parsed = new URL(url); } catch (e) { return; }
  if (parsed.origin !== self.location.origin) return;

  event.respondWith(isHtmlOrNavigation(request) ? networkFirst(request) : cacheFirst(request));
});
