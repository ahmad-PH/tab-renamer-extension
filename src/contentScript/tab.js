import { Favicon } from "../favicon";
import { getLogger } from "../log";
import { TabSignature } from "../types";
import bgScriptApi from "./backgroundScriptApi";

export const faviconLinksCSSQuery = "html > head link[rel~='icon']";

const log = getLogger('Tab', 'debug');
const plog = getLogger('Preservers', 'debug');

/**
 * A class that represents the current document/tab in which the content script is running.
 * The tab title and favicon displayed in the chrome UI, will always match the this.signature
 * object held in the Tab object.
 * The class is exported for type-checking purposes, and should not be instantiated.
 */
export class Tab { 
    static instanceExists = false;
    constructor() {
        if (Tab.instanceExists) {
            throw new Error('Tab instance already exists, should only be instantiated once.');
        }
        Tab.instanceExists = true;
        /** @type {TabSignature|null} */
        this.signature = null;
        this.titleMutationObserver = null;
        // this.faviconMutationObserver = null;
    }

    /**
     * This must be called before using the Tab object, when it is being used inside the 
     * main content script.
     */
    async initializeForMainContentScript() {
        log.debug('initializeForMainContentScript called');
        const signature = await bgScriptApi.loadSignature();
        log.debug('retrieved signature:', signature);
        log.debug('document.title:', document.title, 'faviconUrl:', await bgScriptApi.getFaviconUrl());

        if (signature) { // Then, initializationContentScript would have already set the originals
            log.debug('signature found, setting it.');
            await tab.setSignature(signature, true, false);
        } else {
            const newSignature = new TabSignature(
                null,
                null,
                document.title,
                await bgScriptApi.getFaviconUrl()
            );
            log.debug('signature not found, setting signature to:', newSignature);
            await tab.setSignature(newSignature, false, false);
        }
    }

    setTitle(newTabTitle, preserve = true) {
        log.debug('setDocumentTitle called with newTabTitle:', newTabTitle, preserve);
        if (preserve) {
            this.preserveTabTitle(newTabTitle);
        }
        document.title = newTabTitle;
    }

    setFavicon(faviconUrl, preserve = true) {
        // Check if a favicon link element already exists
        log.debug('setDocumentFavicon called with faviconUrl:', 
            faviconUrl ? faviconUrl.substring(0, 15) : faviconUrl, preserve);
        if (preserve) {
            this.preserveFavicon(faviconUrl);
        }
        let faviconLinks = document.querySelectorAll(faviconLinksCSSQuery);
    
        faviconLinks.forEach(link => {
            link.parentNode.removeChild(link);
        });
    
        const link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'icon';
        link.href = faviconUrl;
        document.getElementsByTagName('head')[0].appendChild(link);
    }

    restoreTitle() {
        log.debug('restoreDocumentTitle called with originalTitle:', this.signature.originalTitle);
        this.disconnectTabTitlePreserver();
        if (this.signature.originalTitle !== document.title) {
            this.setTitle(this.signature.originalTitle, false);
        }
    }
    
    async restoreFavicon() {
        log.debug('restoreDocumentFavicon called with originalFaviconUrl:', this.signature.originalFaviconUrl);
        this.disconnectFaviconPreserver();
        if (this.signature.originalFaviconUrl !== (await bgScriptApi.getFaviconUrl())) {
            this.setFavicon(this.signature.originalFaviconUrl, false);
        }
    }

    /**
     * @param {TabSignature} signature - The signature to set. If the title or favicon are not truthy,
     * they will be divorced from the values shown in the chrome UI (the preservers will be disconnected).
     * This will not restore them to their original values.
     */
    async setSignature(signature, preserve = true, save = true) {
        log.debug('setSignature called with signature:', signature);
        if (signature.title) {
            this.setTitle(signature.title, preserve);
        } else {
            this.disconnectTabTitlePreserver();
        }

        if (signature.favicon) {
            this.setFavicon(Favicon.fromDTO(signature.favicon).getUrl(), preserve);
        } else {
            this.disconnectFaviconPreserver();
        }

        if (save) {
            await bgScriptApi.saveSignature(signature);
        }
        
        this.signature = signature;
    }


    /**
     * This function is required when:
     * 1- On Websites reacting to new routes without triggering a reload, like YouTube
     * 2- On websites like Facebook that keep enforing their own title.
     * Neither of these scenarios require the preserver keep the title the same:
     * 1- Typing a new url in the address bar
     * 2- Searching for a query on Google (automatic changing of the page url)
     * 3- Clicking a link on a website 
     * The loading of the signature from memory is enough for all these cases.
     * The preserver doesn't even help reduce the "flash" of the website's actual title
     * in these scenarios.
     */
    preserveTabTitle(desiredTitle) {
        // Disconnect the previous observer if it exists, to avoid an infinite loop.    
        plog.debug('preserveTabTitle called with desiredTitle:', desiredTitle);
        this.disconnectTabTitlePreserver();
        this.titleMutationObserver = new MutationObserver((mutations) => {
            plog.debug('titleMutationObserver callback called', mutations);
            mutations.forEach((mutation) => {
                if (mutation.target.nodeName === 'TITLE') {
                    const newTitle = document.title;
                    plog.debug('TITLE mutation detected', newTitle, 'while desriedTitle is:', desiredTitle);
                    if (newTitle !== desiredTitle) {
                        document.title = desiredTitle;
                    }
                }
            });
        });

        const titleElement = document.querySelector('head > title');
        plog.debug('titleElement:', titleElement);
        if (titleElement) {
            this.titleMutationObserver.observe(titleElement, { subtree: true, characterData: true, childList: true });
        }
    }

    disconnectTabTitlePreserver() {
        if (this.titleMutationObserver) {
            this.titleMutationObserver.disconnect();
        }
    }

    preserveFavicon() {
        // empty
    }
    
    disconnectFaviconPreserver() {
        // empty
    }

    async getFavicon(url) {
        console.time('getFavicon');
    
        // Fetch the HTML of the webpage
        console.time('fetch');
        log.debug('Fetching: ', url);
        const response = await fetch(url);
        const html = await response.text();
        console.timeEnd('fetch');
    
        // Parse the HTML
        console.time('parse');
        const headStartIndex = html.indexOf('<head>');
        const headEndIndex = html.indexOf('</head>') + '</head>'.length;
        if (headStartIndex === -1 || headEndIndex === -1) {
            throw new Error('Head element not found');
        }
        const headHtml = html.slice(headStartIndex, headEndIndex);
        const doc = new DOMParser().parseFromString(headHtml, 'text/html');
        console.timeEnd('parse');
    
        // Find the favicon link
        let faviconLink = doc.querySelector('link[rel~="icon"]');
    
        // If no favicon link is found, use /favicon.ico
        let faviconUrl;
        if (faviconLink) {
            faviconUrl = new URL(faviconLink.href, url).href;
        } else {
            faviconUrl = new URL('/favicon.ico', url).href;
        }
        console.timeEnd('getFavicon');
        return faviconUrl;
    }
}

const tab = new Tab();
export default tab;