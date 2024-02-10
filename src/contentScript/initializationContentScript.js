import { getLogger } from '../log';
import bgScriptApi from "./backgroundScriptApi";
import tab from "./tab";

const log = getLogger('InitializationContentScript', 'debug');

/** 
 * Update tab signature when the contentScript loads
 */ 
(async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called from the initialization content script.');
    const signature = await bgScriptApi.loadSignature();
    if (signature) {
        log.debug('retrieved signature:', signature);
        await tab.setSignature(signature, false, false);
    } else {
        log.debug('no signature found');
    }
})();