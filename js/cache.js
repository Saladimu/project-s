/**
 * TaskCache Utility Module
 * Handles lightweight client-side caching using localStorage.
 * Implements the foundation for a "Cache-First, Stale-While-Revalidate" strategy.
 */
const TaskCache = {
  // Unique key to prevent collisions with other apps on the same domain
  CACHE_KEY: 'project_s_tasks_cache',

  /**
   * Saves data to localStorage along with the current timestamp.
   * @param {any} data - The data to cache (objects, arrays, etc.).
   */
  save: function(data) {
    try {
      const cachePayload = {
        timestamp: Date.now(),
        data: data
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cachePayload));
      console.log('[TaskCache] ✅ Data saved to cache successfully.');
    } catch (error) {
      console.error('[TaskCache] ❌ Failed to save data to cache:', error);
      // Fallback: clear cache if quota is exceeded or stringify fails
      this.clear();
    }
  },

  /**
   * Retrieves data from localStorage.
   * @returns {object|null} An object containing { timestamp, data } or null if empty/invalid.
   */
  get: function() {
    try {
      const cachedString = localStorage.getItem(this.CACHE_KEY);
      if (!cachedString) {
        return null; // No cache exists
      }
      
      const parsed = JSON.parse(cachedString);
      
      // Basic validation to ensure it has the expected structure
      if (parsed && typeof parsed.timestamp === 'number' && parsed.data !== undefined) {
        return parsed;
      }
      
      console.warn('[TaskCache] ⚠️ Corrupted cache structure detected. Clearing...');
      this.clear();
      return null;
    } catch (error) {
      console.error('[TaskCache] ❌ Failed to parse cache (corrupted data):', error);
      this.clear();
      return null;
    }
  },

  /**
   * Checks if the cached data is still valid based on TTL (Time To Live).
   * @param {number} ttlMinutes - The maximum age of the cache in minutes (e.g., 5).
   * @returns {boolean} True if cache is valid and fresh, false otherwise.
   */
  isValid: function(ttlMinutes) {
    const cached = this.get();
    if (!cached) {
      return false;
    }
    
    const now = Date.now();
    const cacheAgeMs = now - cached.timestamp;
    const ttlMs = ttlMinutes * 60 * 1000;

    if (cacheAgeMs < ttlMs) {
      console.log(`[TaskCache] ⏱️ Cache is valid (age: ${(cacheAgeMs / 1000).toFixed(1)}s, TTL: ${ttlMinutes}m).`);
      return true;
    }
    
    console.log(`[TaskCache] ⏰ Cache expired (age: ${(cacheAgeMs / 1000).toFixed(1)}s, TTL: ${ttlMinutes}m).`);
    return false;
  },

  /**
   * Clears the cache from localStorage.
   */
  clear: function() {
    localStorage.removeItem(this.CACHE_KEY);
    console.log('[TaskCache] 🧹 Cache cleared.');
  },

  /**
   * Helper to get the age of the cache in minutes (useful for UI display like "Updated 2m ago").
   * @returns {number|null} Age in minutes, or null if no cache exists.
   */
  getAgeInMinutes: function() {
    const cached = this.get();
    if (!cached) return null;
    return (Date.now() - cached.timestamp) / (1000 * 60);
  }
};