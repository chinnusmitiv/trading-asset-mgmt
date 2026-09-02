/**
 * Idempotency.gs
 * Prevents duplicate transactions and replay attacks during mobile network instability.
 */

var IDEMPOTENCY_CACHE_TTL_SECONDS = 3600; // 1 hour

function checkIdempotency(requestId) {
  if (!requestId) return null;
  var cache = CacheService.getScriptCache();
  var cachedResponse = cache.get('idemp_' + requestId);
  if (cachedResponse) {
    try {
      return JSON.parse(cachedResponse);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function recordIdempotency(requestId, responseObj) {
  if (!requestId) return;
  var cache = CacheService.getScriptCache();
  try {
    cache.put('idemp_' + requestId, JSON.stringify(responseObj), IDEMPOTENCY_CACHE_TTL_SECONDS);
  } catch (e) {
    Logger.log('Failed to cache idempotency: ' + e);
  }
}
