class CacheValue {
    favicon: string;
    lastUsed: number;

    constructor(favicon: string, lastUsed: number) {
        this.favicon = favicon;
        this.lastUsed = lastUsed;
    }
}

class FaviconCache {
    cache: Record<string, CacheValue>;

    constructor() {
        this.cache = {};
    }
    
    get(url: string): string | null {
        const value = this.cache[url];
        return value ? value.favicon : null;
    }
    
    set(url: string, favicon: string): void {
        this.cache[url] = new CacheValue(favicon, Date.now());
    }
}

export { FaviconCache, CacheValue as CacheEntry};

