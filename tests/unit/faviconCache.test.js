const appRoot = require('app-root-path');
const { FaviconCache } = require(`${appRoot}/src/background/faviconCache`);

describe('FaviconCache', () => {
    let faviconCache = null;

    beforeEach(() => {
        faviconCache = new FaviconCache();
    });

    test('simple set and get', () => {
        const url = 'https://www.google.com/';
        const favicon = 'https://www.google.com/favicon.ico';
        const cacheEntry = faviconCache.get(url);
        expect(cacheEntry).toBeNull();

        faviconCache.set(url, favicon);
        expect(faviconCache.get(url)).toBe(favicon);
    });
});