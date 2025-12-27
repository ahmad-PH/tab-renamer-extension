import { storageGet } from "../utils";
import { TabInfo } from "../types";
import { tabRepository } from "../repositories/tabRepository";
import { settingsRepository } from "../repositories/settingsRepository";
import { getLogger } from "../log";
import { startTheGarbageCollector } from "./garbageCollector";
import { COMMAND_CLOSE_WELCOME_TAB, COMMAND_DISCARD_TAB, COMMAND_MOVE_TAB, COMMAND_OPEN_RENAME_DIALOG, COMMAND_SET_EMOJI_STYLE, inProduction } from "../config";
import { markAllOpenSignaturesAsClosed } from "./markAllOpenSignaturesAsClosed";
import { StorageSchemaManager } from "./storageSchemaManager";
import { handleTitleChange } from "./titleChangeHandler";

const log = getLogger('background');

const originalTitleStash: Record<number, string> = {};
let welcomeTab: chrome.tabs.Tab | null = null;

async function showRenameUnavailablePopup() {
    try {
        await chrome.action.setPopup({ popup: 'popup/popup.html' });
        await chrome.action.openPopup();
        // Clear the popup after a short delay so normal icon clicks work again
        setTimeout(() => {
            void chrome.action.setPopup({ popup: '' });
        }, 10);
    } catch (error) {
        log.debug("Could not open the popup in showRenameUnavailablePopup() function:", error);
        await chrome.action.setPopup({ popup: '' });
    }
}

async function openRenameDialogOnTab(tabId: number) {
    try {
        log.debug('Sending open rename dialog command to tab:', tabId);
        await chrome.tabs.sendMessage(tabId, { command: COMMAND_OPEN_RENAME_DIALOG });
    } catch (error) {
        log.debug('Failed to open rename dialog, showing fallback popup:', error);
        await showRenameUnavailablePopup();
    }
}

chrome.commands.onCommand.addListener((command) => {
    if (command === COMMAND_OPEN_RENAME_DIALOG) {
        log.debug('Received open rename dialog command.');
        chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
            void openRenameDialogOnTab(tabs[0].id!);
        }).catch(error => {
            log.error('Failed to query active tab:', error);
        });
    }
});

chrome.action.onClicked.addListener((tab) => {
    void openRenameDialogOnTab(tab.id!);
});

chrome.runtime.onMessage.addListener((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    switch (message.command) {
        case "get_tab_info":
            sendResponse({ id: sender.tab!.id, url: sender.tab!.url, index: sender.tab!.index });
            break;

        case "save_signature": {
            const tab = new TabInfo(sender.tab!.id!, sender.tab!.url!, sender.tab!.index!,
                false, null, message.signature);
            void tabRepository.save(tab);
            break;
        }

        case "load_signature":
            tabRepository.loadTabAndUpdateId(sender.tab!.id!, sender.tab!.url!, sender.tab!.index!, message.isBeingOpened)
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

        // case "refresh_tab": {
        //     storageGet(sender.tab!.id)
        //     // loadTab(sender.tab!.id!, sender.tab!.url!, sender.tab!.index!, message.isBeingOpened)
        //     // .then((tab) => {
        //     //     if (tab) {
        //     //         saveTab

        //     //     } else {
        //     //         log.error(`refresh_tab command tried to load tab information with id: ${sender.tab!.id!}, but found no records.`)
        //     //         return sendResponse(null);
        //     //     }
        //     // })
        // }
    }
});

chrome.tabs.onRemoved.addListener((tabId: number, _removeInfo: chrome.tabs.TabRemoveInfo) => {
    void tabRepository.runExclusive(async () => {
        let tabInfo = await tabRepository.getById(tabId);
        if (tabInfo) {
            tabInfo.isClosed = true;
            tabInfo.closedAt = new Date().toISOString();
            await tabRepository.save(tabInfo);
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === 'unloaded' && changeInfo.discarded === true) {
        void tabRepository.runExclusive(async () => {
            log.debug('Detected update on unloaded and discarded tab:', JSON.stringify(tab));
            const matchingTab = await tabRepository.findOldRecordOfFreshlyDiscardedTab(tab.url!, tab.index!);
            log.debug('Found matching tab:', matchingTab);
            if (matchingTab) {
                log.debug(`Removing tab with id ${matchingTab.id} from storage and replacing it with ${tab.id}`);
                await tabRepository.delete(matchingTab.id);
                matchingTab.id = tab.id!;
                await tabRepository.save(matchingTab);
            } else {
                log.debug('Nothing matched. Must have been a discarded tab that never had its signature modified.');
            }
        });
    } else {
        if (changeInfo.title != null) {
            // This portion is needed solely for the purpose of pdf pages that use Chrome's built-in PDF viewer.
            // They act weird, in that they will change the title directly in the UI, without document.title being touched.
            // As a result, the chane goes past my MutationObservers, but I can catch it here.
            void handleTitleChange(tabId, changeInfo.title);
        }
        if (changeInfo.url != null) {
            void tabRepository.runExclusive(async () => {
                log.debug(`UrlUpdate: change detected on tabId: ${tabId}, changeInfo: ${JSON.stringify(changeInfo)}, current tabInfo:`, await tabRepository.getById(tabId));
                const tabInfo = await tabRepository.getById(tabId);
                if (tabInfo) { // Only if we are actually tracking the tab
                    tabInfo.url = changeInfo.url!;
                    await tabRepository.save(tabInfo);
                    log.debug("UrlUpdate: Storage after saving tabInfo:", await tabRepository.getAll());
                }
            });
        }
    }
});

chrome.tabs.onMoved.addListener((tabId: number, moveInfo: chrome.tabs.TabMoveInfo) => {
    log.debug(`Detected a tabs.onMoved event, tabId: ${tabId}, moveInfo: ${JSON.stringify(moveInfo)}`);
    void tabRepository.runExclusive(async () => {
        const windowTabs = await chrome.tabs.query({ windowId: moveInfo.windowId });
        log.debug(`onMoved, retrieved window tabs: ${JSON.stringify(windowTabs)}, and the current stored tabs: ${JSON.stringify(await tabRepository.getAll())}`);
        
        const tabsToUpdate: TabInfo[] = [];
        for (const windowTab of windowTabs) {
            const tabInfo = await tabRepository.getById(windowTab.id!);
            if (tabInfo) {
                tabInfo.index = windowTab.index;
                tabsToUpdate.push(tabInfo);
            }
        }
        
        if (tabsToUpdate.length > 0) {
            await tabRepository.updateMany(tabsToUpdate);
        }
    });
});

chrome.runtime.onStartup.addListener(() => {
    void (async () => {
        log.debug('onStartup listener called');
        await markAllOpenSignaturesAsClosed();
    })();
});

chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
    void (async () => {
        log.debug('onInstalled listener called with details:', details);
        const allTabs = await chrome.tabs.query({status: 'complete', discarded: false});
        for (const tab of allTabs) {
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
        }

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

        chrome.contextMenus.create({
            id: "changelogPage",
            title: "View Changelog",
            contexts: ["action"],
        });

        if (details.reason === "install") {
            log.debug("onInstalled with reason = install triggered");
            welcomeTab = await chrome.tabs.create({url: chrome.runtime.getURL('assets/welcome.html')});
        } else if (details.reason === "update") {
            log.debug("onInstalled with reason = update triggered");
            await chrome.tabs.create({url: chrome.runtime.getURL('assets/changelog.html')});
            
            const migratedData = new StorageSchemaManager().verifyCorrectSchemaVersion(await storageGet(null));
            await chrome.storage.sync.clear();
            for (const key of Object.keys(migratedData)) {
                await chrome.storage.sync.set({[key]: migratedData[key]});
            }
        } else if (details.reason === "chrome_update") {
            await markAllOpenSignaturesAsClosed();
        }
    })();
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === "renameTab") {
        void openRenameDialogOnTab(tab!.id!);
    }
    if (info.menuItemId === "onboardingPage") {
        void chrome.tabs.create({ url: chrome.runtime.getURL('assets/welcome.html') });
    }
    if (info.menuItemId === "changelogPage") {
        void chrome.tabs.create({ url: chrome.runtime.getURL('assets/changelog.html') });
    }
});

chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
    console.assert(port.name === "content-script");
});

if (!inProduction()) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        log.debug('Received message in background.js: ', message);
        switch (message.command) {
            case COMMAND_DISCARD_TAB: {
                log.debug('Received discard tab command. sender tab id:', sender.tab!.id);
                chrome.tabs.discard(sender.tab!.id!, (discardedTab) => {
                    void (async () => {
                        log.debug('Tab discarded:', discardedTab);
                        const tabs = await chrome.tabs.query({currentWindow: true});
                        log.debug('List of tabs after discarding:', tabs);
                        tabs.forEach(tab => {
                            log.debug(`Tab ID: ${tab.id}, URL: ${tab.url}, Title: ${tab.title}, Discarded: ${tab.discarded}`);
                        });
                        setTimeout(() => {
                            void chrome.tabs.reload(discardedTab!.id!);
                        }, 500);
                    })();
                });
                break;
            }

            case COMMAND_CLOSE_WELCOME_TAB: {
                if (welcomeTab) {
                    void chrome.tabs.remove(welcomeTab.id!);
                    welcomeTab = null;
                }
                break;
            }

            case COMMAND_SET_EMOJI_STYLE: {
                log.debug("Received set emoji style command at background.js with value:", message.style);
                settingsRepository.setEmojiStyle(message.style).catch(reason => {
                    throw new Error(`Error while setting emoji style: ${reason}`);
                });
                break;
            }

            case 'test': {
                void (async () => {
                    log.debug('Received test command')
                    log.debug('Contents of chrome storage:', await chrome.storage.sync.get(null));
                })();
                break;
            }

            case COMMAND_MOVE_TAB: {
                log.debug('Received move tab command at background.js with index:', message.index);
                chrome.tabs.move(sender.tab!.id!, { index: message.index }, (movedTab) => {
                    log.debug('Tab moved:', movedTab);
                    sendResponse({ success: true, tab: movedTab });
                });
                return true;
            }
        }
    });
}

startTheGarbageCollector();

