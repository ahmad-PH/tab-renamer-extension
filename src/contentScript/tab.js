import { Favicon } from "../favicon";
import log from "../log";
import { TabSignature } from "../types";
import bgScriptApi from "./backgroundScriptApi";
import { preserveFavicon, preserveTabTitle, disconnectFaviconPreserver, disconnectTabTitlePreserver } from "./preservers";

export const faviconLinksCSSQuery = "html > head link[rel~='icon']";

/**
 * A class that represents the current document, or tab, which the content script is running in.
 * The class is exported by type-checking purposes, and should not be instantiated.
 */
export class Tab { 
    static instanceExists = false;
    constructor() {
        if (Tab.instanceExists) {
            throw new Error('Tab instance already exists, should only be instantiated once.');
        }
        Tab.instanceExists = true;
    }

    setTitle(newTabTitle, preserve = true) {
        log.debug('setDocumentTitle called with newTabTitle:', newTabTitle, preserve);
        if (preserve) {
            preserveTabTitle(newTabTitle);
        }
        document.title = newTabTitle;
    }

    setFavicon(faviconUrl, preserve = true) {
        // Check if a favicon link element already exists
        log.debug('setDocumentFavicon called with faviconUrl:', faviconUrl, preserve);
        let faviconLinks = document.querySelectorAll(faviconLinksCSSQuery);
    
        faviconLinks.forEach(link => {
            link.parentNode.removeChild(link);
        });
    
        const link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'icon';
        link.href = faviconUrl;
        document.getElementsByTagName('head')[0].appendChild(link);
    
        if (preserve) {
            preserveFavicon(faviconUrl);
        }
    }

    restoreTitle(originalTitle) {
        log.debug('restoreDocumentTitle called with originalTitle:', originalTitle);
        disconnectTabTitlePreserver();
        this.setTitle(originalTitle, false);
    }
    
    restoreFavicon(originalFaviconUrl) {
        log.debug('restoreDocumentFavicon called with originalFaviconUrl:', originalFaviconUrl);
        disconnectFaviconPreserver();
        this.setFavicon(originalFaviconUrl, false);
    }

    /**
     * @param {TabSignature} signature - The signature to set. If the title or favicon are not truthy,
     * they will be restored to their original form.
     */
    async setSignature(signature, preserve = true, save = true) {
        log.debug('setDocumentSignature called with signature:', signature);
        if (signature.title) {
            this.setTitle(signature.title, preserve);
        } else {
            this.restoreTitle(signature.originalTitle);
        }

        if (signature.favicon) {
            this.setFavicon(Favicon.fromDTO(signature.favicon).getUrl(), preserve);
        } else {
            this.restoreFavicon(signature.originalFaviconUrl);
        }

        if (save) {
            await bgScriptApi.saveSignature(signature);
        }
    }
}

const tab = new Tab();
Object.freeze(tab);

export default tab;