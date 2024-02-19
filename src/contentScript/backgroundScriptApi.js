import { getLogger } from "../log";
import { TabSignature } from "../types";
import { Tab } from "./tab";

let log = getLogger('BackgroundScriptAPI', 'debug');

class BackgroundScriptAPI {
    /**
     * @param {TabSignature} signature 
     */
    async saveSignature(signature) {
        await chrome.runtime.sendMessage({command: "save_signature", signature});
    }

    /**
     * @returns {Promise<TabSignature> | null}
     */
    async loadSignature() {
        const response = await chrome.runtime.sendMessage({command: "load_signature"});
        if (response) {
            return TabSignature.fromObject(response);
        } else {
            return null;
        }
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