import { storageGet, storageSet } from "../utils";
import { TabInfo } from "../types";
import { findOldRecordOfFreshlyDiscardedTab, loadTab, saveTab } from "./signatureStorage";
import { getLogger } from "../log";
import { startTheGarbageCollector } from "./garbageCollector";
import { COMMAND_CLOSE_WELCOME_TAB, COMMAND_DISCARD_TAB, COMMAND_OPEN_RENAME_DIALOG, inProduction } from "../config";

const log = getLogger('background', 'debug');

const originalTitleStash = {};
let welcomeTab = null;

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

// Listen for messages from content script(s):
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "get_tab_info") {
        sendResponse({ id: sender.tab.id,  url: sender.tab.url, index: sender.tab.index});

    } else if (message.command === "save_signature") {
        const tab = new TabInfo(sender.tab.id, sender.tab.url, sender.tab.index,
            false, null, message.signature);
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

    } else if (message.command === "unstash_original_title") {
        const result = originalTitleStash[sender.tab.id];
        delete originalTitleStash[sender.tab.id];
        sendResponse(result);

    }
});

chrome.tabs.onRemoved.addListener(async function(tabId, _removeInfo) {
    /** @type {TabInfo} */
    let tabInfo = await storageGet(tabId);
    if (tabInfo) {
        tabInfo.isClosed = true;
        tabInfo.closedAt = new Date().toISOString();
        await storageSet({[tabId]: tabInfo});
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'unloaded' && changeInfo.discarded === true) {
        const storedTabInfo = await storageGet(null);
        log.debug('Detected update on unloaded and discarded tab:', JSON.stringify(tab));
        const matchingTab = findOldRecordOfFreshlyDiscardedTab(storedTabInfo, tab.url, tab.index);
        log.debug('Found matching tab:', matchingTab);
        if (matchingTab) {
            log.debug(`Removing tab with id ${matchingTab.id} from storage and replacing it with ${tab.id}`);
            await chrome.storage.sync.remove(matchingTab.id.toString());
            matchingTab.id = tab.id;
            await storageSet({[tab.id]: matchingTab});
        } else {
            log.debug('Nothing matched. Must have been a discarded tab that never had its signature modified.');
        }
    }
});

/**
 * This function makes sure the contentScript gets injected properly when extension is installed or
 * updated without requiring the user to reload the tabs.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    const allTabs = await chrome.tabs.query({status: 'complete', discarded: false});
    log.debug('after query:', allTabs);
    allTabs.forEach(async (tab) => {
        if (
            (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
            !tab.url.startsWith('https://chrome.google.com/webstore/devconsole') && // The extensions gallery cannot be scripted 
            !tab.url.startsWith('https://chromewebstore.google.com/') // same as above
        ) { 
            log.debug('Injecting the extension into:', tab.url);
            try {
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    files: ['initializationContentScript.js']
                });
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

    if (details.reason === "install") {
        welcomeTab = await chrome.tabs.create({url: chrome.runtime.getURL('assets/welcome.html')});
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "renameTab") {
        chrome.tabs.sendMessage(tab.id, {command: COMMAND_OPEN_RENAME_DIALOG});
    }
});

chrome.runtime.onConnect.addListener((port) => {
    console.assert(port.name === "content-script");
    // log.debug('Connection with content script established successfully.');
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, {command: COMMAND_OPEN_RENAME_DIALOG});
});

if (!inProduction()) {
    chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
        if (message.command === COMMAND_DISCARD_TAB) {
            log.debug('Received discard tab command. sender tab id:', sender.tab.id);
            chrome.tabs.discard(sender.tab.id, async (discardedTab) => {

                log.debug('Tab discarded:', discardedTab);
                const tabs = await chrome.tabs.query({currentWindow: true});
                log.debug('List of tabs after discarding:', tabs);
                tabs.forEach(tab => {
                    log.debug(`Tab ID: ${tab.id}, URL: ${tab.url}, Title: ${tab.title}, Discarded: ${tab.discarded}`);
                });
                setTimeout(async () => {
                    chrome.tabs.reload(discardedTab.id);
                }, 500);
            });
        }  else if (message.command === 'test') {
            log.debug('Received test command. List of tabs:');
            chrome.tabs.query({currentWindow: true}, tabs => {
                tabs.forEach(tab => {
                    log.debug(`Tab ID: ${tab.id}, URL: ${tab.url}, Title: ${tab.title}, Discarded: ${tab.discarded}`);
                });
            });
        } else if (message.command === COMMAND_CLOSE_WELCOME_TAB && welcomeTab) {
            chrome.tabs.remove(welcomeTab.id);
            welcomeTab = null;
        }
    });
}

startTheGarbageCollector();

