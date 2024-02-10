const { default: log } = require("../log");
import bgScriptApi from "./backgroundScriptApi";
import tab from "./tab";

/** 
 * Update tab signature when the contentScript loads
 */ 
(async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called');
    const signature = await bgScriptApi.loadSignature();
    if (signature) {
        log.debug('retrieved signature:', signature);
        await tab.setSignature(signature, false, false);
    } else {
        log.debug('no signature found');
    }
})();