import { getLogger } from "../log";
import { TabSignature } from "../types";

let log = getLogger('BackgroundScriptAPI', 'debug');

class BackgroundScriptAPI {
    /**
     * @param {TabSignature} signature 
     */
    async saveSignature(signature) {
        log.debug('saveSignature called with signature:', signature);
        log.debug('Current stack trace:', new Error().stack);
        try {
            await chrome.runtime.sendMessage({command: "save_signature", signature});
        } catch (error) {
            log.error('Failed to save signature:', error);
            throw error;
        }
    }

    /**
     * @returns {Promise<TabSignature>}
     */
    async loadSignature() {
        try {
            return await chrome.runtime.sendMessage({command: "load_signature"});
        } catch (error) {
            log.error('Failed to load signature:', error);
            throw error;
        }
    }

    async getTabInfo() {
        try {
            return await chrome.runtime.sendMessage({ command: "get_tab_info" });
        } catch (error) {
            console.error('Failed to get tab Info:', error);
            throw error;
        }
    }

    async getFaviconUrl() {
        try {
            return await chrome.runtime.sendMessage({ command: "get_favicon_url" });
        } catch (error) {
            console.error('Failed to get favicon:', error);
            throw error;
        }
    }
}

export default new BackgroundScriptAPI();