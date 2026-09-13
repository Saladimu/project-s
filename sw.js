/* Project S - service worker.
 * Freshness-first, speed on repeat visits:
 *  - navigations/HTML : network-first with a short timeout, cached shell as fallback
 *  - versioned CSS/JS  : cache-first (instant after first visit)
 *  - images            : cache-first
 * The worker script is registered with updateViaCache:'none' so a deploy is
 * picked up on the next load. */
var CACHE_NAME = 'project-s-v5';
var NETWORK_TIMEOUT = 3000;

/* Only unversioned files are precached. Versioned assets (styles.css?v=..,
 * app.js?v=..) are cached on first use by the cache-first handler, keyed by
 * their exact URL, so we never download them twice. */
var PRECACHE = [
  './',
  './index.html',
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

function offlineFallback(request) {
  if (isHtmlOrNavigation(request)) {
    return caches.match('./index.html').then(function (cached) {
      return cached || Response.error();
    });
  }
  return Promise.resolve(Response.error());
}

function networkFirst(request, event) {
  var cachedPromise = caches.match(request);
  var timedOut = false;

  var networkPromise = fetch(request).then(function (response) {
    putInCache(request, response);
    return response;
  });

  /* Keep the worker alive so a timed-out request still refreshes the cache. */
  if (event && event.waitUntil) {
    event.waitUntil(networkPromise.then(function () {}, function () {}));
  }

  var timeoutPromise = new Promise(function (resolve) {
    setTimeout(function () {
      timedOut = true;
      resolve(null);
    }, NETWORK_TIMEOUT);
  });

  return Promise.race([
    networkPromise.catch(function () { return null; }),
    timeoutPromise
  ]).then(function (result) {
    if (result) return result;
    if (timedOut) {
      /* Slow network: serve the cached shell now; networkPromise keeps running
       * in the background and refreshes the cache for the next load. */
      return cachedPromise.then(function (cached) {
        if (cached) return cached;
        return networkPromise.then(function (res) {
          return res || offlineFallback(request);
        });
      });
    }
    return cachedPromise.then(function (cached) {
      return cached || offlineFallback(request);
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

  event.respondWith(isHtmlOrNavigation(request) ? networkFirst(request, event) : cacheFirst(request));
});
