import { getLogger } from '../log';
import { TabSignature } from '../types';
import bgScriptApi from "./backgroundScriptApi";
import tab from "./tab";

const log = getLogger('InitializationContentScript', 'debug');

/** 
 * Update tab signature when the contentScript loads
 * This is mainly useful to:
 * - Eliminate the flash of the page's original title when the page change to a new title
 */ 
(async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called from the initialization content script.');
    const signature = await bgScriptApi.loadSignature();
    let title, favicon;
    if (signature) {
        log.debug('retrieved signature:', signature);
        title = signature.title;
        favicon = signature.favicon;
    } else {
        log.debug('no signature found');
        title = null;
        favicon = null;
    }

    let originalTitle = document.title;
    let originalFaviconUrl = await bgScriptApi.getFaviconUrl();

    const newSignature = new TabSignature(title, favicon, originalTitle, originalFaviconUrl);
    log.debug('setting signature to:', newSignature);
    await tab.setSignature(newSignature, false, false);
})();