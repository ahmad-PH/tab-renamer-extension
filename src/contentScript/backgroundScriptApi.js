import log from "../log";
import { TabSignature } from "../types";

class BackgroundScriptAPI {
    /**
     * @param {TabSignature} signature 
     */
    async saveSignature(signature) {
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
            log.error('Failed to save signature:', error);
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
}

export default new BackgroundScriptAPI();