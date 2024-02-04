import log from "../log";
import { TabSignature } from "../types";
import { emojiToDataURL } from "../utils";
import bgScriptApi from "./backgroundScriptApi";
import { preserveFavicon, preserveTabTitle } from "./preservers";

function setDocumentTitle(newTabTitle, preserve = true) {
    if (preserve) {
        preserveTabTitle(newTabTitle);
    }
    document.title = newTabTitle;
}

function setDocumentFavicon(favicon, preserve = true) {
    // Check if a favicon link element already exists
    let faviconLinks = document.querySelectorAll("html > head link[rel~='icon']");

    faviconLinks.forEach(link => {
        link.parentNode.removeChild(link);
    });

    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    // The only supported type of favicon is emojis, so the favicon is assumed to be one.
    const emojiDataURL = emojiToDataURL(favicon, 64);
    link.href = emojiDataURL;
    document.getElementsByTagName('head')[0].appendChild(link);

    if (preserve) {
        preserveFavicon(emojiDataURL);
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
        setDocumentFavicon(signature.favicon, preserve);
    }
    if (save) {
        // Even this call will know not to set the title or favicon if they are not truthy.
        await bgScriptApi.saveSignature(signature);
    }
}
