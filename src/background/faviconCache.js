class CacheValue {
    constructor(favicon, lastUsed) {
        this.favicon = favicon;
        this.lastUsed = lastUsed;
    }
}

class FaviconCache {
    constructor() {
        /** @type {Object.<string, CacheValue>} */
        this.cache = {};
    }
    
    get(url) {
        const value = this.cache[url];
        return value ? value.favicon : null;
    }
    
    set(url, favicon) {
        this.cache[url] = new CacheValue(favicon, Date.now());
    }
}

export { FaviconCache, CacheValue as CacheEntry};