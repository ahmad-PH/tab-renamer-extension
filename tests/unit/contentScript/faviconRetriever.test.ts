import { JSDOM } from 'jsdom';
import FaviconRetriever from 'src/contentScript/faviconRetriever';

describe('FaviconRetriever', () => {
    let faviconRetriever: FaviconRetriever;
    let dom: JSDOM;
    let url1: string, url2: string, mockResponse1: Response, mockResponse2: Response;

    beforeAll(() => {
        dom = new JSDOM();
        global.DOMParser = dom.window.DOMParser as any;
    });

    beforeEach(() => {
        faviconRetriever = new FaviconRetriever();

        url1 = 'https://example.com';
        url2 = 'https://another-example.com';
        mockResponse1 = new Response('<head><link rel="icon" href="favicon.ico"><link rel="icon" href="another-favicon.ico"></head>');
        mockResponse2 = new Response('<head><link rel="icon" href="different-favicon.ico"></head>');
        
        global.fetch = jest.fn((url) => {
            if (url === url1) {
                return Promise.resolve(mockResponse1);
            } else if (url === url2) { 
                return Promise.resolve(mockResponse2);
            }
        }) as any;
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test('getFaviconLinks returns cached links for the same URL', async () => {
        const firstCallLinks = await faviconRetriever.getFaviconLinks(url1);
        const secondCallLinks = await faviconRetriever.getFaviconLinks(url1);

        expect(firstCallLinks).toBe(secondCallLinks);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('getFaviconLinks fetches new links for a different URL', async () => {
        const links1 = await faviconRetriever.getFaviconLinks(url1);
        const links2 = await faviconRetriever.getFaviconLinks(url2);

        expect(links1).not.toBe(links2);
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('getFaviconLinks throws an error if the head element is not found', async () => {
        const url = 'https://example.com';
        const mockResponse = new Response('<html><body>No head element here</body></html>');
        (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

        await expect(faviconRetriever.getFaviconLinks(url)).rejects.toThrow('Head element not found');
    });

    test('getFaviconLinks returns an array of link elements', async () => {
        const links = await faviconRetriever.getFaviconLinks(url1);

        expect(links).toBeInstanceOf(Array);
        expect(links.length).toBe(2);
        links.forEach(link => {
            expect(link).toBeInstanceOf(dom.window.HTMLLinkElement);
            expect(link.rel).toContain('icon');
        });
    });

    test('preFetchFaviconLinks prefetches links', async () => {
        await faviconRetriever.preFetchFaviconLinks(url1);

        const links = await faviconRetriever.getFaviconLinks(url1);

        expect(links).toBeInstanceOf(Array);
        expect(links.length).toBe(2);
        links.forEach(link => {
            expect(link).toBeInstanceOf(dom.window.HTMLLinkElement);
            expect(link.rel).toContain('icon');
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('getFaviconLinks fetches new results for different URL', async () => {
        await faviconRetriever.preFetchFaviconLinks(url1);
        const links = await faviconRetriever.getFaviconLinks(url2);
    
        expect(links).toBeInstanceOf(Array);
        expect(links.length).toBe(1);
        links.forEach(link => {
            expect(link).toBeInstanceOf(dom.window.HTMLLinkElement);
            expect(link.rel).toContain('icon');
        });
    
        expect(global.fetch).toHaveBeenCalledTimes(2);
    });
});

