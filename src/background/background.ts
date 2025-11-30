import { getAllTabs, storageGet, storageSet } from "../utils";
import { TabInfo } from "../types";
import { findOldRecordOfFreshlyDiscardedTab, loadTab, saveTab } from "./signatureStorage";
import { getLogger } from "../log";
import { startTheGarbageCollector } from "./garbageCollector";
import { COMMAND_CLOSE_WELCOME_TAB, COMMAND_DISCARD_TAB, COMMAND_OPEN_RENAME_DIALOG, COMMAND_SET_EMOJI_STYLE, inProduction, SETTINGS_KEY_EMOJI_STYLE } from "../config";
import { markAllOpenSignaturesAsClosed } from "./markAllOpenSignaturesAsClosed";
import { StorageSchemaManager } from "./storageSchemaManager";

const log = getLogger('background', 'debug');

const originalTitleStash: Record<number, string> = {};
let welcomeTab: chrome.tabs.Tab | null = null;

chrome.commands.onCommand.addListener((command) => {
    if (command === COMMAND_OPEN_RENAME_DIALOG) {
        log.debug('Received open rename dialog command.');
        chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
            return chrome.tabs.sendMessage(tabs[0].id!, {
                command: COMMAND_OPEN_RENAME_DIALOG,
                tabId: tabs[0].id
            });
        }).catch(error => 
            {log.error('query error', error);}
        );
    }
});

chrome.action.onClicked.addListener((tab) => {
    log.debug('Action clicked. Sending open rename dialog command to tab:', tab.id);
    chrome.tabs.sendMessage(tab.id!, {command: COMMAND_OPEN_RENAME_DIALOG});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.command) {
        case "get_tab_info":
            sendResponse({ id: sender.tab!.id, url: sender.tab!.url, index: sender.tab!.index });
            break;

        case "save_signature": {
            const tab = new TabInfo(sender.tab!.id!, sender.tab!.url!, sender.tab!.index!,
                false, null, message.signature);
            saveTab(tab);
            break;
        }

        case "load_signature":
            loadTab(sender.tab!.id!, sender.tab!.url!, sender.tab!.index!, message.isBeingOpened)
                .then((tab) => {
                    const signature = tab ? tab.signature : null;
                    return sendResponse(signature);
                }).catch(e => {
                    log.error('Error while loading signature:', e);
                    return sendResponse(null);
                });
            return true;

        case "get_favicon_url":
            sendResponse(sender.tab!.favIconUrl);
            break;

        case "stash_original_title":
            originalTitleStash[sender.tab!.id!] = message.originalTitle;
            break;

        case "unstash_original_title": {
            const result = originalTitleStash[sender.tab!.id!];
            delete originalTitleStash[sender.tab!.id!];
            sendResponse(result);
            break;
        }
    }
});

chrome.tabs.onRemoved.addListener(async function(tabId: number, _removeInfo: chrome.tabs.TabRemoveInfo) {
    let tabInfo: TabInfo = await storageGet(tabId);
    if (tabInfo) {
        tabInfo.isClosed = true;
        tabInfo.closedAt = new Date().toISOString();
        await storageSet({[tabId]: tabInfo});
    }
});

chrome.tabs.onUpdated.addListener(async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === 'unloaded' && changeInfo.discarded === true) {
        const storedTabInfo = await getAllTabs();
        log.debug('Detected update on unloaded and discarded tab:', JSON.stringify(tab));
        const matchingTab = findOldRecordOfFreshlyDiscardedTab(storedTabInfo, tab.url!, tab.index!);
        log.debug('Found matching tab:', matchingTab);
        if (matchingTab) {
            log.debug(`Removing tab with id ${matchingTab.id} from storage and replacing it with ${tab.id}`);
            await chrome.storage.sync.remove(matchingTab.id.toString());
            matchingTab.id = tab.id!;
            await storageSet({[tab.id!]: matchingTab});
        } else {
            log.debug('Nothing matched. Must have been a discarded tab that never had its signature modified.');
        }
    }
});

chrome.runtime.onStartup.addListener(async () => {
    log.debug('onStartup listener called');
    await markAllOpenSignaturesAsClosed();
});

chrome.runtime.onInstalled.addListener(async (details: chrome.runtime.InstalledDetails) => {
    log.debug('onInstalled listener called with details:', details);
    const allTabs = await chrome.tabs.query({status: 'complete', discarded: false});
    allTabs.forEach(async (tab) => {
        if (
            (tab.url!.startsWith('http://') || tab.url!.startsWith('https://')) &&
            !tab.url!.startsWith('https://chrome.google.com/webstore/devconsole') &&
            !tab.url!.startsWith('https://chromewebstore.google.com/')
        ) { 
            log.debug('Injecting the extension into:', tab.url);
            try {
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id!},
                    files: ['initializationContentScript.js']
                });
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id!},
                    files: ['contentScript.js']
                });
            } catch (e) {
                log.error('Error while injecting the extension into: ', tab.url, 'full tab info', JSON.stringify(tab), e);
            }
        }
    });

    chrome.contextMenus.create({
        "id": "renameTab",
        "title": "Rename Tab",
        "contexts": ["page"]
    });

    chrome.contextMenus.create({
        id: "onboardingPage",
        title: "View Onboarding Page",
        contexts: ["action"],
    });

    if (details.reason === "install") {
        welcomeTab = await chrome.tabs.create({url: chrome.runtime.getURL('assets/welcome.html')});
    } else if (details.reason === "update") {
        const migratedData = new StorageSchemaManager().verifyCorrectSchemaVersion(await storageGet(null));
        await chrome.storage.sync.clear();
        for (const key of Object.keys(migratedData)) {
            await chrome.storage.sync.set({[key]: migratedData[key]});
        }
    } 
    await markAllOpenSignaturesAsClosed();
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === "renameTab") {
        chrome.tabs.sendMessage(tab!.id!, {command: COMMAND_OPEN_RENAME_DIALOG});
    }
    if (info.menuItemId === "onboardingPage") {
        chrome.tabs.create({ url: chrome.runtime.getURL('assets/welcome.html') });
    }
});

chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
    console.assert(port.name === "content-script");
});

if (!inProduction()) {
    chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
        log.debug('Received a message in background.js: ', message);
        switch (message.command) {
            case COMMAND_DISCARD_TAB: {
                log.debug('Received discard tab command. sender tab id:', sender.tab!.id);
                chrome.tabs.discard(sender.tab!.id!, async (discardedTab) => {
                    log.debug('Tab discarded:', discardedTab);
                    const tabs = await chrome.tabs.query({currentWindow: true});
                    log.debug('List of tabs after discarding:', tabs);
                    tabs.forEach(tab => {
                        log.debug(`Tab ID: ${tab.id}, URL: ${tab.url}, Title: ${tab.title}, Discarded: ${tab.discarded}`);
                    });
                    setTimeout(async () => {
                        chrome.tabs.reload(discardedTab!.id!);
                    }, 500);
                });
                break;
            }

            case COMMAND_CLOSE_WELCOME_TAB: {
                if (welcomeTab) {
                    chrome.tabs.remove(welcomeTab.id!);
                    welcomeTab = null;
                }
                break;
            }

            case COMMAND_SET_EMOJI_STYLE: {
                log.debug("Received set emoji style command at background.js with value:", message.style);
                chrome.storage.sync.set({[SETTINGS_KEY_EMOJI_STYLE]: message.style}).catch(reason => {
                    throw new Error(`Error while setting emoji style: ${reason}`);
                });
                break;
            }

            case 'test': {
                (async () => {
                    log.debug('Received test command')
                    log.debug('Contents of chrome storage:', await chrome.storage.sync.get(null));
                })();
                break;
            }
        }
    });
}

startTheGarbageCollector();

