/**
 * Cache utility for API responses
 */

// Default cache expiration time (in milliseconds) - 1 hour
const DEFAULT_CACHE_EXPIRATION = 60 * 60 * 1000;

/**
 * Save data to the cache with expiration
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} expirationMs - Expiration time in milliseconds
 */
export const saveToCache = (
  key,
  data,
  expirationMs = DEFAULT_CACHE_EXPIRATION
) => {
  const item = {
    data,
    expiry: new Date().getTime() + expirationMs,
  };
  localStorage.setItem(key, JSON.stringify(item));
};

/**
 * Retrieve data from cache if valid, otherwise return null
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/not found
 */
export const getFromCache = (key) => {
  const cachedItem = localStorage.getItem(key);

  if (!cachedItem) return null;

  const item = JSON.parse(cachedItem);
  const now = new Date().getTime();

  // Check if the item is expired
  if (now > item.expiry) {
    localStorage.removeItem(key);
    return null;
  }

  return item.data;
};

/**
 * Clear a specific cache entry
 * @param {string} key - Cache key to clear
 */
export const clearCache = (key) => {
  localStorage.removeItem(key);
};

/**
 * Clear all cache entries
 */
export const clearAllCache = () => {
  localStorage.clear();
};
