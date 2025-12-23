import { storageGet } from "../utils";
import { TabInfo } from "../types";
import { tabRepository } from "../repositories/tabRepository";
import { settingsRepository } from "../repositories/settingsRepository";
import { getLogger } from "../log";
import { startTheGarbageCollector } from "./garbageCollector";
import { COMMAND_CLOSE_WELCOME_TAB, COMMAND_DISCARD_TAB, COMMAND_MOVE_TAB, COMMAND_OPEN_RENAME_DIALOG, COMMAND_SET_EMOJI_STYLE, inProduction } from "../config";
import { markAllOpenSignaturesAsClosed } from "./markAllOpenSignaturesAsClosed";
import { StorageSchemaManager } from "./storageSchemaManager";

const log = getLogger('background');

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
    void chrome.tabs.sendMessage(tab.id!, {command: COMMAND_OPEN_RENAME_DIALOG});
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
    void (async () => {
        let tabInfo = await tabRepository.getById(tabId);
        if (tabInfo) {
            tabInfo.isClosed = true;
            tabInfo.closedAt = new Date().toISOString();
            await tabRepository.save(tabInfo);
        }
    })();
});

chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    void (async () => {
        if (changeInfo.status === 'unloaded' && changeInfo.discarded === true) {
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
        } else {
            log.debug(`onUpdated called, with non-discard conditions, tabId: ${tabId}, changeInfo: ${JSON.stringify(changeInfo)}`);
            if (changeInfo.url) {
                const tabInfo = await tabRepository.getById(tabId);
                log.debug('retrieved tabInfo:', tabInfo);
                if (tabInfo) { // Only if we are actually tracking the tab
                    tabInfo.url = changeInfo.url;
                    await tabRepository.save(tabInfo);
                    log.debug("Storage after saving tabInfo:", await tabRepository.getAll());
                }
            }
        }
    })();
});

chrome.tabs.onMoved.addListener((tabId: number, moveInfo: chrome.tabs.TabMoveInfo) => {
    log.debug(`Detected a tabs.onMoved event, tabId: ${tabId}, moveInfo: ${JSON.stringify(moveInfo)}`);
    void (async () => {
        const tabInfo = await tabRepository.getById(tabId);
        if (tabInfo) {
            tabInfo.index = moveInfo.toIndex;
            await tabRepository.save(tabInfo);
        }
    })();
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
    })();
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === "renameTab") {
        void chrome.tabs.sendMessage(tab!.id!, {command: COMMAND_OPEN_RENAME_DIALOG});
    }
    if (info.menuItemId === "onboardingPage") {
        void chrome.tabs.create({ url: chrome.runtime.getURL('assets/welcome.html') });
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

