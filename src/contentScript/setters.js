import { Favicon } from "../favicon";
import log from "../log";
import { TabSignature } from "../types";
import bgScriptApi from "./backgroundScriptApi";
import { preserveFavicon, preserveTabTitle, disconnectFaviconPreserver, disconnectTabTitlePreserver } from "./preservers";

export const faviconLinksCSSQuery = "html > head link[rel~='icon']";

function setDocumentTitle(newTabTitle, preserve = true) {
    log.debug('setDocumentTitle called with newTabTitle:', newTabTitle, preserve);
    if (preserve) {
        preserveTabTitle(newTabTitle);
    }
    document.title = newTabTitle;
}

function setDocumentFavicon(faviconUrl, preserve = true) {
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

function restoreDocumentTitle(originalTitle) {
    log.debug('restoreDocumentTitle called with originalTitle:', originalTitle);
    disconnectTabTitlePreserver();
    setDocumentTitle(originalTitle, false);
}

function restoreDocumentFavicon(originalFaviconUrl) {
    log.debug('restoreDocumentFavicon called with originalFaviconUrl:', originalFaviconUrl);
    disconnectFaviconPreserver();
    setDocumentFavicon(originalFaviconUrl, false);
}

/**
 * @param {TabSignature} signature - The signature to set. If the title or favicon are not truthy,
 * they will be restored to their original form.
 */
export async function setDocumentSignature(signature, preserve = true, save = true) {
    log.debug('setDocumentSignature called with signature:', signature);
    if (signature.title) {
        setDocumentTitle(signature.title, preserve);
    } else {
        restoreDocumentTitle(signature.originalTitle);
    }

    if (signature.favicon) {
        setDocumentFavicon(Favicon.fromDTO(signature.favicon).getUrl(), preserve);
    } else {
        restoreDocumentFavicon(signature.originalFaviconUrl);
    }

    if (save) {
        await bgScriptApi.saveSignature(signature);
    }
}
