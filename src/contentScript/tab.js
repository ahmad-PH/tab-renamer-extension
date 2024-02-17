import { Favicon } from "../favicon";
import { getLogger } from "../log";
import { TabSignature, FaviconDTO } from "../types";
import bgScriptApi from "./backgroundScriptApi";
import FaviconRetriever from "./faviconRetriever";

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
        this.faviconRetriever = new FaviconRetriever();
        this.injectedFaviconLinkElement = null;
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
            await this.setSignature(signature.title, signature.favicon, true, false);
            this.signature.originalTitle = signature.originalTitle;
            // await tab.setSignature(signature, true, false);
        } else {
            log.debug('signature not found');
            await this.setSignature(null, null, false, false);
            this.signature.originalTitle = document.title;
            // const newSignature = new TabSignature(
            //     null,
            //     null,
            //     document.title,
            //     await bgScriptApi.getFaviconUrl()
            // );
            // await tab.setSignature(newSignature, false, false);
        }
    }

    /**
     * @param {string} title
     * @param {FaviconDTO} favicon
     * 
     * they will be divorced from the values shown in the chrome UI (the preservers will be disconnected).
     * This will not restore them to their original values.
     */
    async setSignature(title, favicon, preserve = true, save = true) {
        log.debug('setSignature called with signature:', title, favicon);
        if (title) {
            this._setTitle(title, preserve);
        } else {
            this._restoreTitle();
        }

        if (favicon) {
            this._setFavicon(Favicon.fromDTO(favicon).getUrl(), preserve);
        } else {
            this._restoreFavicon();
        }

        if (this.signature) {
            this.signature.title = title;
            this.signature.favicon = favicon;
        } else {
            this.signature = new TabSignature(title, favicon, null, null);
        }

        if (save) {
            await bgScriptApi.saveSignature(this.signature);
        }
        
    }

    preFetchOriginalFavicon() {
        this.faviconRetriever.preFetchFaviconLinks(document.URL);
    }

    _setTitle(newTabTitle, preserve = true) {
        log.debug('setDocumentTitle called with newTabTitle:', newTabTitle, preserve);
        if (preserve) {
            this._preserveTabTitle(newTabTitle);
        }
        document.title = newTabTitle;
    }

    _setFavicon(faviconUrl, preserve = true) {
        // Check if a favicon link element already exists
        log.debug('setDocumentFavicon called with faviconUrl:', 
            faviconUrl ? faviconUrl.substring(0, 15) : faviconUrl, preserve);
        if (preserve) {
            this._preserveFavicon(faviconUrl);
        }
        let faviconLinks = document.querySelectorAll(faviconLinksCSSQuery);
    
        faviconLinks.forEach(link => {
            link.parentNode.removeChild(link);
        });
    
        const link = this._createFaviconLinkElement(faviconUrl);
        document.getElementsByTagName('head')[0].appendChild(link);
        this.injectedFaviconLinkElement = link;
    }

    _createFaviconLinkElement(faviconUrl) {
        const link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'icon';
        link.href = faviconUrl;
        return link;
    }

    _restoreTitle() {
        log.debug('restoreDocumentTitle called. Current signature', this.signature);
        this.disconnectTabTitlePreserver();
        if (this.signature && this.signature.title && this.signature.originalTitle !== document.title) {
            this._setTitle(this.signature.originalTitle, false);
        }
    }
    
    async _restoreFavicon() {
        log.debug('restoreFavicon called. Current signature', this.signature);
        this.disconnectFaviconPreserver();
        if (this.signature && this.signature.favicon) { // favicon has been modified from original value
            log.debug('Favicon has been modified.');
            let faviconLinks = await this.faviconRetriever.getFaviconLinks(document.URL);
            log.debug('retrieved faviconLinks:', faviconLinks.map(link => link.outerHTML));
            if (faviconLinks.length === 0) {
                faviconLinks = [this._createFaviconLinkElement(new URL('/favicon.ico', document.URL).toString())];
                log.debug('No favicon links found, using default /favicon.ico:', faviconLinks.map(link => link.outerHTML));
            }

            const head = document.getElementsByTagName('head')[0];
            head.removeChild(this.injectedFaviconLinkElement);
            this.injectedFaviconLinkElement = null;
            
            head.append(...faviconLinks);

        }
        // if (this.signature.originalFaviconUrl !== (await bgScriptApi.getFaviconUrl())) {
        //     this._setFavicon(this.signature.originalFaviconUrl, false);
        // }
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
    _preserveTabTitle(desiredTitle) {
        //Disconnect the previous observer if it exists, to avoid an infinite loop.    
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

    _preserveFavicon(_faviconUrl) {
        // empty
    }
    
    disconnectFaviconPreserver() {
        // empty
    }


}

const tab = new Tab();
export default tab;