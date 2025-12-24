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
const titleCorrectionState: Record<number, { lastTime: number; retriesUsed: number }> = {};
const TITLE_CORRECTION_THRESHOLD_SECONDS = 0.5; 
const TITLE_CORRECTION_MAX_RETRIES = 1; 
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
    void tabRepository.runExclusive(async () => {
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
            if (changeInfo.title) {
                log.debug(`TitleUpdate: Detected a title change for tabId: ${tabId}, changeInfo: ${JSON.stringify(changeInfo)}, current tabInfo:`, await tabRepository.getAll());
                const tabInfo = await tabRepository.getById(tabId);
                // log.debug(`TitleUpdate: tabInfo.signature.title: ${tabInfo?.signature?.title}, changeInfo.title: ${changeInfo.title}`);
                if (tabInfo?.signature?.title != null &&
                    tabInfo.signature.title !== changeInfo.title && // Only if an actual change has happened
                    changeInfo.title != "" // Preventing self-recursion
                ) {
                    const now = Date.now();
                    const state = titleCorrectionState[tabId] ?? { lastTime: 0, retriesUsed: 0 };
                    const elapsedSeconds = (now - state.lastTime) / 1000;
                    const thresholdPassed = elapsedSeconds > TITLE_CORRECTION_THRESHOLD_SECONDS;
                    const hasRetriesLeft = state.retriesUsed < TITLE_CORRECTION_MAX_RETRIES;
                    
                    if (thresholdPassed || hasRetriesLeft) {
                        log.debug(`TitleUpdate: executing script to set document.title to the desired title. (thresholdPassed: ${thresholdPassed}, retriesUsed: ${state.retriesUsed})`)
                        await chrome.scripting.executeScript({
                            target: { tabId },
                            func: (title: string) => { document.title = ""; document.title = title; },
                            args: [tabInfo.signature.title]
                        });
                        if (thresholdPassed) {
                            titleCorrectionState[tabId] = { lastTime: now, retriesUsed: 0 };
                        } else {
                            titleCorrectionState[tabId] = { lastTime: state.lastTime, retriesUsed: state.retriesUsed + 1 };
                        }
                    } else {
                        log.debug(`TitleUpdate: Skipping title correction, only ${elapsedSeconds.toFixed(1)}s elapsed (need ${TITLE_CORRECTION_THRESHOLD_SECONDS}s) and no retries left`);
                    }
                }
            }
            if (changeInfo.url) {
                log.debug(`UrlUpdate: change detected on tabId: ${tabId}, changeInfo: ${JSON.stringify(changeInfo)}, current tabInfo:`, await tabRepository.getAll());
                const tabInfo = await tabRepository.getById(tabId);
                log.debug('UrlUpdate: retrieved tabInfo:', tabInfo);
                if (tabInfo) { // Only if we are actually tracking the tab
                    tabInfo.url = changeInfo.url;
                    log.debug("UrlUpdate: Storage before saving tabInfo:", await tabRepository.getAll());
                    await tabRepository.save(tabInfo);
                    log.debug("UrlUpdate: Storage after saving tabInfo:", await tabRepository.getAll());
                }
            }
        }
    });
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

        if (details.reason === "install") {
            log.debug("onInstalled with reason = install triggered");
            welcomeTab = await chrome.tabs.create({url: chrome.runtime.getURL('assets/welcome.html')});
        } else if (details.reason === "update") {
            log.debug("onInstalled with reason = update triggered");
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

