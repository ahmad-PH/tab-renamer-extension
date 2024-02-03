const { default: log } = require("../log");
import bgScriptApi from "./backgroundScriptApi";
import { setTabTitle, setTabFavicon } from "./setters";

/** Update tab signature when the contentScript loads:
 *  This is an immediately invoked function expression (IIFE)
 */ 
export async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called');
    const signature = await bgScriptApi.loadSignature();
    if (signature) {
        log.debug('retrieved signature:', signature);
        if (signature.title) {
            setTabTitle(signature.title, false);
        }
        if (signature.favicon) {
            setTabFavicon(signature.favicon, false);
        }
    } else {
        log.debug('no signature found');
    }
}
