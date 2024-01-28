import log from "../log";
import { emojiToDataURL } from "../utils";
import bgScriptApi from "./backgroundScriptApi";
import { preserveFavicon, preserveTabTitle } from "./preservers";

export async function setTabTitle(newTabTitle, preserve = true) {
    log.debug('setTabTitle called with newTabTitle:', newTabTitle);
    if (preserve) {
        preserveTabTitle(newTabTitle);
    }
    document.title = newTabTitle;
    await bgScriptApi.saveSignature(newTabTitle, null);
}

export async function setTabFavicon(favicon, preserve = true) {
    // Check if a favicon link element already exists
    const faviconLinks = document.querySelectorAll("link[rel*='icon']");
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

    await bgScriptApi.saveSignature(null, favicon);
    if (preserve) {
        preserveFavicon(emojiDataURL);
    }
}
