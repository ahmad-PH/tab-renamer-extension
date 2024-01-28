import log from "../log";

class BackgroundScriptAPI {
    async saveSignature(title, favicon) {
        try {
            await chrome.runtime.sendMessage({command: "save_signature", title, favicon});
        } catch (error) {
            log.error('Failed to save signature:', error);
            throw error;
        }
    }

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