const { getLogger } = require("../log");

const log = getLogger('FaviconRetriever', 'warn');

class FaviconRetriever {
    constructor() {
        this.lastFetchedUrl = null;
        this.lastFetchedLinks = null;
        this.prefetchPromise = null;
    }

    async getFaviconLinks(url) {
        log.debug(`getFaviconLinks called with url: ${url}`);
        if (this.prefetchPromise) {
            await this.prefetchPromise; // Wait for prefetch to complete
        }
        if (url === this.lastFetchedUrl) {
            log.debug('Returning cached links:', this.lastFetchedLinks.map(link => link.outerHTML));
            return this.lastFetchedLinks;
        }
        this.lastFetchedLinks = await this._getFaviconLinks(url);
        this.lastFetchedUrl = url;
        log.debug('New links fetched:', this.lastFetchedLinks.map(link => link.outerHTML));
        return this.lastFetchedLinks;
    }


    /**
     * Initiates the pre-fetching of the favicon links for the given URL.
     * Returns a promise that resolves once the prefetch is complete.
     *
     * @param {string} url - The URL to pre-fetch the favicon links for.
     * @returns {Promise} A promise that resolves once the prefetch is complete.
     */
    preFetchFaviconLinks(url) {
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

    async _getFaviconLinks(url) {
        // Fetch the HTML of the webpage
        // console.time('fetch');
        log.debug('_getFaviconLinks: ', url);
        const response = await fetch(url);
        const html = await response.text();
        log.debug('The response:', html);

        // console.timeEnd('fetch');
    
        // Parse the HTML
        const headStartIndex = html.indexOf('<head'); // No '>' as it might contain attributes
        const headEndIndex = html.indexOf('</head>') + '</head>'.length;
        if (headStartIndex === -1 || headEndIndex === -1) {
            log.debug('Head element not found, the response:', html);
            throw new Error('Head element not found');
        }
        const headHtml = html.slice(headStartIndex, headEndIndex);
        const doc = new DOMParser().parseFromString(headHtml, 'text/html');
    
        // Find all the <link> elements that contain the word "icon" in their "rel" attribute
        const faviconLinks = Array.from(doc.querySelectorAll('link[rel~="icon"]'));

        log.debug('_getFaviconLinks, retrieved: ', faviconLinks.map(link => link.outerHTML));
    
        return faviconLinks;
    }
}

export default FaviconRetriever;