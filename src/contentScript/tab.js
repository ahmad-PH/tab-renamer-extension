import { Favicon } from "../favicon";
import log from "../log";
import { TabSignature } from "../types";
import bgScriptApi from "./backgroundScriptApi";

export const faviconLinksCSSQuery = "html > head link[rel~='icon']";

/**
 * A class that represents the current document/tab in which the content script is running.
 * The class is exported for type-checking purposes, and should not be instantiated.
 */
export class Tab { 
    static instanceExists = false;
    constructor() {
        if (Tab.instanceExists) {
            throw new Error('Tab instance already exists, should only be instantiated once.');
        }
        Tab.instanceExists = true;

        this.tabMutationObserver = null;
        this.faviconMutationObserver = null;
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
            this.preserveFavicon(faviconUrl);
        }
    }

    restoreTitle(originalTitle) {
        log.debug('restoreDocumentTitle called with originalTitle:', originalTitle);
        this.disconnectTabTitlePreserver();
        this.setTitle(originalTitle, false);
    }
    
    restoreFavicon(originalFaviconUrl) {
        log.debug('restoreDocumentFavicon called with originalFaviconUrl:', originalFaviconUrl);
        this.disconnectFaviconPreserver();
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


    /* This function seems to be only required when:
    * 1- Clicking on a link that changes the tab
    * 2- On websites like Facebook that keep enforing their own title
    */

    preserveTabTitle(desiredTitle) {
        // Disconnect the previous observer if it exists, to avoid an infinite loop.    
        log.debug('preserveTabTitle called with desiredTitle:', desiredTitle);
        this.disconnectTabTitlePreserver();
        this.tabMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.nodeName === 'TITLE') {
                    const newTitle = document.title;
                    if (newTitle !== desiredTitle) {
                        document.title = desiredTitle;
                    }
                }
            });
        });

        const titleElement = document.querySelector('head > title');
        if (titleElement) {
            this.tabMutationObserver.observe(titleElement, { subtree: true, characterData: true, childList: true });
        }
    }

    disconnectTabTitlePreserver() {
        log.debug('disconnectTabTitlePreserver called');
        if (this.tabMutationObserver) {
            this.tabMutationObserver.disconnect();
        }
    }


    /**
     * @param {string} emojiDataURL
     */
    preserveFavicon(emojiDataURL) {
        // Disconnect the previous observer if it exists, to avoid infinite loop.
        this.disconnectFaviconPreserver();

        this.faviconMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                const target = mutation.target;
                if (target instanceof HTMLLinkElement) {
                    if (target.nodeName === 'LINK' && target.rel.includes('icon')) {
                        if (target.href !== emojiDataURL) {
                            target.href = emojiDataURL;
                        }
                    }
                }

            });
        });

        const headElement = document.querySelector('head');
        if (headElement) {
            this.faviconMutationObserver.observe(headElement, { subtree: true, childList: true, attributes: true });
        }
    }

    disconnectFaviconPreserver() {
        if (this.faviconMutationObserver) {
            this.faviconMutationObserver.disconnect();
        }
    }

}

const tab = new Tab();

export default tab;