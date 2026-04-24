// Force cache invalidation on every load
export function CacheInvalidator() {
  if (typeof window !== 'undefined') {
    // Add unique timestamp to force browser cache invalidation
    const now = new Date().getTime();
    const cacheKey = `matia_cache_bust_${now}`;
    
    // Clear all service worker caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Force reload from network
    if (navigator.onLine) {
      fetch(window.location.href, { cache: 'no-store' });
    }
  }
  
  return null;
}
