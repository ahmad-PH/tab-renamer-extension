import { getLogger } from '../log';
import { TabSignature } from '../types';
import bgScriptApi from "./backgroundScriptApi";
import tab from "./tab";

const log = getLogger('InitializationContentScript', 'warn');

/** 
 * Update tab signature when the contentScript loads
 * This is mainly useful to:
 * - Eliminate the flash of the page's original title when the page change to a new title
 */ 
(async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called from the initialization content script.');
    const signature = await bgScriptApi.loadSignature();
    let title;
    if (signature) {
        log.debug('retrieved signature:', signature);
        title = signature.title;
    } else {
        log.debug('no signature found');
        title = null;
    }

    let originalTitle = document.title;
    let originalFaviconUrl = await bgScriptApi.getFaviconUrl();
    log.debug('document.title:', originalTitle, 'faviconUrl:', (originalFaviconUrl ? (originalFaviconUrl.substring(0, 30) + '...') : null));


    log.debug('DOCUMENT READY STATE:', document.readyState);

    await tab.setSignature(title, null, false, false);
    tab.signature.originalTitle = originalTitle;
})();


