import { getLogger } from "../log";
import { TabSignature } from "../types";

let log = getLogger('BackgroundScriptAPI', 'debug');

class BackgroundScriptAPI {
    /**
     * @param {TabSignature} signature 
     */
    async saveSignature(signature) {
        await chrome.runtime.sendMessage({command: "save_signature", signature});
    }

    /**
     * @returns {Promise<TabSignature>}
     */
    async loadSignature() {
        return await chrome.runtime.sendMessage({command: "load_signature"});
    }

    async getTabInfo() {
        return await chrome.runtime.sendMessage({ command: "get_tab_info" });
    }

    async getFaviconUrl() {
        return await chrome.runtime.sendMessage({ command: "get_favicon_url" });
    }

    async stashOriginalTitle(originalTitle) {
        await chrome.runtime.sendMessage({ command: "stash_original_title", originalTitle });
    }

    /**
     * @returns {Promise<string>}
     */
    async unstashOriginalTitle() {
        return await chrome.runtime.sendMessage({ command: "unstash_original_title" });
    }
}

export default new BackgroundScriptAPI();