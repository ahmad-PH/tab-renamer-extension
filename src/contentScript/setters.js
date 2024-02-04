import log from "../log";
import { TabSignature } from "../types";
import { emojiToDataURL } from "../utils";
import bgScriptApi from "./backgroundScriptApi";
import { preserveFavicon, preserveTabTitle } from "./preservers";

export const faviconLinksCSSQuery = "html > head link[rel~='icon']";

function setDocumentTitle(newTabTitle, preserve = true) {
    if (preserve) {
        preserveTabTitle(newTabTitle);
    }
    document.title = newTabTitle;
}

function setDocumentFaviconEmoji(favicon, preserve = true) {
    setDocumentFavicon(emojiToDataURL(favicon, 64), preserve);
}

function setDocumentFavicon(faviconUrl, preserve = true) {
    // Check if a favicon link element already exists
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


/**
 * @param {TabSignature} signature - The signature to set. If the title or favicon are not truthy, they will not be set.
 */
export async function setDocumentSignature(signature, preserve = true, save = true) {
    log.debug('setDocumentSignature called with signature:', signature);
    if (signature.title) {
        setDocumentTitle(signature.title, preserve);
    }
    if (signature.favicon) {
        setDocumentFaviconEmoji(signature.favicon, preserve);
    }
    if (save) {
        // Even this call will know not to set the title or favicon if they are not truthy.
        await bgScriptApi.saveSignature(signature);
    }
}
