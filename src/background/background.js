import { storageGet, storageSet } from "../utils";
import { TabInfo } from "../types";
import { loadTab, saveTab } from "./signatureStorage";
import { getLogger } from "../log";
import { startTheGarbageCollector } from "./garbageCollector";
import { COMMAND_OPEN_RENAME_DIALOG } from "../config";

const log = getLogger('background', 'debug');

const originalTitleStash = {};

chrome.commands.onCommand.addListener((command) => {
    if (command === COMMAND_OPEN_RENAME_DIALOG) {
        chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
            return chrome.tabs.sendMessage(tabs[0].id, {
                command: COMMAND_OPEN_RENAME_DIALOG,
                tabId: tabs[0].id
            });
        }).catch(error => 
            {log.error('query error', error);}
        );
    }
});

// Listen for any messages from content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "get_tab_info") {
        sendResponse({ id: sender.tab.id,  url: sender.tab.url, index: sender.tab.index});

    } else if (message.command === "save_signature") {
        const tab = new TabInfo(sender.tab.id, sender.tab.url, sender.tab.index,
            false, null, message.signature, false);
        saveTab(tab);

    } else if (message.command === "load_signature") {
        loadTab(sender.tab.id, sender.tab.url, sender.tab.index, message.isBeingOpened)
        .then((tab) => {
            const signature = tab ? tab.signature : null;
            return sendResponse(signature);
        }).catch(e => {
            log.error('Error while loading signature:', e);
            return sendResponse(null);
        });
        return true; // To indicate that the response will be asynchronous

    } else if (message.command === "get_favicon_url") {
        sendResponse(sender.tab.favIconUrl);

    } else if (message.command === "stash_original_title") {
        originalTitleStash[sender.tab.id] = message.originalTitle;
        console.log(`Stashed original title '${message.originalTitle}' for tabId ${sender.tab.id}`);

    } else if (message.command === "unstash_original_title") {
        const result = originalTitleStash[sender.tab.id];
        delete originalTitleStash[sender.tab.id];
        console.log(`Unstashed original title '${result}' for tabId ${sender.tab.id}`);
        sendResponse(result);
    }

    if (message.command === 'test') {
        chrome.tabs.query
    }
});


const markTabAsClosed = async (tabId) => {
    /** @type {TabInfo} */
    let tabInfo = await storageGet(tabId);
    if (tabInfo) {
        tabInfo.isClosed = true;
        tabInfo.closedAt = new Date().toISOString();
        await storageSet({[tabId]: tabInfo});
    }
};

chrome.tabs.onRemoved.addListener(async function(tabId, removeInfo) {
    log.debug('onRemoved listener called:');
    log.debug('tab closed:', tabId, removeInfo);
    await markTabAsClosed(tabId);
});

const markTabAsDiscarded = async (tabId) => {
    /** @type {TabInfo} */
    let tabInfo = await storageGet(tabId);
    if (tabInfo) {
        tabInfo.isDiscarded = true;
        await storageSet({[tabId]: tabInfo});
    }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
    if (changeInfo.discarded) {
        console.log(`Tab ${tabId} was discarded`);
        await markTabAsDiscarded(tabId);
    }
});

/**
 * This function makes sure the contentScript gets injected properly when extension is installed or
 * updated without requiring the user to reload the tabs.
 */
chrome.runtime.onInstalled.addListener(async () => {
    const allTabs = await chrome.tabs.query({status: 'complete', discarded: false});
    log.debug('after query:', allTabs);
    allTabs.forEach(async (tab) => {
        if (
            (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
            !tab.url.startsWith('https://chrome.google.com/webstore/devconsole') // The extensions gallery cannot be scripted 
        ) { 
            try {
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    files: ['contentScript.js']
                });
            } catch (e) {
                log.error('Error while injecting the extension into: ', tab.url, 'full tab info', JSON.stringify(tab), e);
            }
        }
    });

    // Create a context menu item:
    chrome.contextMenus.create({
        "id": "renameTab",
        "title": "Rename Tab",
        "contexts": ["page"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "renameTab") {
        chrome.tabs.sendMessage(tab.id, {command: COMMAND_OPEN_RENAME_DIALOG});
    }
});

chrome.runtime.onConnect.addListener((port) => {
    console.assert(port.name === "content-script");
    log.debug('Connection with content script established successfully.');
});

startTheGarbageCollector();
