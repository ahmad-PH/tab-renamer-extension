import { getLogger } from "../log";

const log = getLogger('FaviconRetriever', 'warn');

class FaviconRetriever {
    lastFetchedUrl: string | null = null;
    lastFetchedLinks: HTMLLinkElement[] | null = null;
    prefetchPromise: Promise<void> | null = null;

    async getFaviconLinks(url: string): Promise<HTMLLinkElement[]> {
        log.debug(`getFaviconLinks called with url: ${url}`);
        if (this.prefetchPromise) {
            await this.prefetchPromise;
        }
        if (url === this.lastFetchedUrl) {
            log.debug('Returning cached links:', this.lastFetchedLinks!.map(link => link.outerHTML));
            return this.lastFetchedLinks!;
        }
        this.lastFetchedLinks = await this._getFaviconLinks(url);
        this.lastFetchedUrl = url;
        log.debug('New links fetched:', this.lastFetchedLinks.map(link => link.outerHTML));
        return this.lastFetchedLinks;
    }

    preFetchFaviconLinks(url: string): Promise<void> {
        log.debug(`preFetch called with url: ${url}, last fetched url: ${this.lastFetchedUrl}`);
        if (url !== this.lastFetchedUrl) {
            return this.prefetchPromise = this._getFaviconLinks(url).then((links) => {
                this.lastFetchedLinks = links;
                this.lastFetchedUrl = url;
                return;
            }).catch((error) => {
                log.error(`Error prefetching favicon links for url ${url}:`, error);
                return;
            });
        } else {
            return Promise.resolve();
        }
    }

    async _getFaviconLinks(url: string): Promise<HTMLLinkElement[]> {
        log.debug('_getFaviconLinks: ', url);
        const response = await fetch(url);
        const html = await response.text();
        log.debug('The response:', html);
    
        const headStartIndex = html.indexOf('<head');
        const headEndIndex = html.indexOf('</head>') + '</head>'.length;
        if (headStartIndex === -1 || headEndIndex === -1) {
            log.debug('Head element not found, the response:', html);
            throw new Error('Head element not found');
        }
        const headHtml = html.slice(headStartIndex, headEndIndex);
        const doc = new DOMParser().parseFromString(headHtml, 'text/html');
    
        const faviconLinks = Array.from(doc.querySelectorAll('link[rel~="icon"]')) as HTMLLinkElement[];

        log.debug('_getFaviconLinks, retrieved: ', faviconLinks.map(link => link.outerHTML));
    
        return faviconLinks;
    }
}

export default FaviconRetriever;

