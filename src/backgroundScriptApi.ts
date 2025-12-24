import { TabSignature } from "./types";

interface TabInfo {
    id: number;
    url: string;
    index: number;
}

class BackgroundScriptAPI {
    async saveSignature(signature: TabSignature): Promise<void> {
        await chrome.runtime.sendMessage({command: "save_signature", signature});
    }

    async loadSignature(isBeingOpened: boolean): Promise<TabSignature | null> {
        const response = await chrome.runtime.sendMessage({command: "load_signature", isBeingOpened});
        if (response) {
            return TabSignature.fromObject(response);
        } else {
            return null;
        }
    }

    async getTabInfo(): Promise<TabInfo> {
        return await chrome.runtime.sendMessage({ command: "get_tab_info" });
    }

    async getFaviconUrl(): Promise<string> {
        return await chrome.runtime.sendMessage({ command: "get_favicon_url" });
    }

    async stashOriginalTitle(originalTitle: string): Promise<void> {
        await chrome.runtime.sendMessage({ command: "stash_original_title", originalTitle });
    }

    async unstashOriginalTitle(): Promise<string> {
        return await chrome.runtime.sendMessage({ command: "unstash_original_title" });
    }
}

export default new BackgroundScriptAPI();

