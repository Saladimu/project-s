var TaskCache = (function () {
  var STORE_KEY = 'projects_data_cache';
  var DEFAULT_TTL_MS = 5 * 60 * 1000;
  var memory = null;
  var persistTimer = null;

  function now() {
    return Date.now();
  }

  function storeKey(opts) {
    return (opts && opts.key) || STORE_KEY;
  }

  function normalize(parsed, key) {
    if (!parsed || typeof parsed !== 'object') return null;
    var ts = typeof parsed.timestamp === 'number'
      ? parsed.timestamp
      : (typeof parsed.ts === 'number' ? parsed.ts : NaN);
    if (!isFinite(ts) || parsed.data === undefined) return null;
    return {
      timestamp: ts,
      data: parsed.data,
      cacheKey: parsed.cacheKey || parsed.key || '',
      _key: key
    };
  }

  function readMemory(key) {
    if (memory && memory._key === key) return memory;
    try {
      var raw = localStorage.getItem(key);
      if (!raw) {
        memory = null;
        return null;
      }
      memory = normalize(JSON.parse(raw), key);
      return memory;
    } catch (e) {
      memory = null;
      return null;
    }
  }

  function persist(key, entry) {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    persistTimer = setTimeout(function () {
      persistTimer = null;
      try {
        localStorage.setItem(key, JSON.stringify({
          timestamp: entry.timestamp,
          ts: entry.timestamp,
          data: entry.data,
          cacheKey: entry.cacheKey,
          key: entry.cacheKey
        }));
      } catch (e) {
        try { localStorage.removeItem(key); } catch (e2) {}
      }
    }, 0);
  }

  return {
    CACHE_KEY: STORE_KEY,
    TTL_MS: DEFAULT_TTL_MS,

    save: function (data, opts) {
      opts = opts || {};
      var key = storeKey(opts);
      memory = {
        timestamp: now(),
        data: data,
        cacheKey: opts.cacheKey || '',
        _key: key
      };
      persist(key, memory);
    },

    get: function (opts) {
      opts = opts || {};
      var entry = readMemory(storeKey(opts));
      if (!entry) return null;
      if (opts.cacheKey && entry.cacheKey && entry.cacheKey !== opts.cacheKey) return null;
      return entry;
    },

    isValid: function (ttlMinutes, opts) {
      var entry = this.get(opts);
      if (!entry) return false;
      var ttlMs = (ttlMinutes != null && ttlMinutes !== '')
        ? Number(ttlMinutes) * 60 * 1000
        : DEFAULT_TTL_MS;
      if (!isFinite(ttlMs) || ttlMs <= 0) ttlMs = DEFAULT_TTL_MS;
      return (now() - entry.timestamp) < ttlMs;
    },

    clear: function (opts) {
      var key = storeKey(opts);
      memory = null;
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      try { localStorage.removeItem(key); } catch (e) {}
    },

    getAgeInMinutes: function (opts) {
      var entry = this.get(opts);
      if (!entry) return null;
      return (now() - entry.timestamp) / 60000;
    }
  };
})();
