import { TabInfo } from "../types";
import { getAllTabs, storageGet, storageSet } from "../utils";
import { getLogger } from "../log";

const log = getLogger('signatureStorage.js', 'warn');

function findMatchingTab(storedTabInfo: Record<number, TabInfo>, tabId: number, url: string, index: number): TabInfo | null {
    log.debug('findMatchingTab called with:', { storedTabInfo, tabId, url, index });

    if (storedTabInfo[tabId]) {
        log.debug('Tab found in storedTabInfo:', storedTabInfo[tabId]);
        return storedTabInfo[tabId];
    } else {
        const candidateTabs = Object.values(storedTabInfo).filter(
            tabInfoValue => tabInfoValue.isClosed && tabInfoValue.url === url 
        );
        log.debug('candidate tabs:', candidateTabs);

        if (candidateTabs.length == 1) {
            log.debug('One closed tab with matching URL found:', candidateTabs[0]);
            return candidateTabs[0];
        } else if (candidateTabs.length > 1) {
            const tabMatchingURLAndIndex = candidateTabs.find(tabInfo => tabInfo.index === index);
            log.debug('tabMatchingURLAndIndex:', tabMatchingURLAndIndex);

            if (tabMatchingURLAndIndex) {
                return tabMatchingURLAndIndex;
            } else {
                candidateTabs.sort((tabInfo1, tabInfo2) => {
                    return new Date(tabInfo2.closedAt!).valueOf() - new Date(tabInfo1.closedAt!).valueOf() 
                });
                log.debug('Most recent tab:', candidateTabs[0]);
                return candidateTabs[0];
            }
        }
    }

    log.debug('No matching tab found');
    return null;
}

export function findOldRecordOfFreshlyDiscardedTab(storedTabInfo: Record<number, TabInfo>, url: string, index: number): TabInfo | null {
    log.debug('findOldRecordOfFreshlyDiscardedTab called with:', { url, index, storedTabInfo});

    const candidateTabs = Object.values(storedTabInfo).filter(
        tabInfoValue => !tabInfoValue.isClosed && tabInfoValue.url === url && tabInfoValue.index === index
    );

    if (candidateTabs.length == 1) {
        log.debug('One matching tab found:', candidateTabs[0]);
        return candidateTabs[0];
    } else if (candidateTabs.length == 0) {
        log.debug('No matching tab found');
        return null;
    } else {
        throw new Error('More than one candidate tab found for freshly discarded tab. This is unexpected.');
    }
}

async function loadTab(tabId: number, url: string, index: number, isBeingOpened: boolean): Promise<TabInfo | null> {
    log.debug('tabId:', tabId, 'url:', url, 'index:', index, 'isBeingOpened:', isBeingOpened);
    const storedTabInfo = await getAllTabs();
    log.debug('storedTabInfo:', storedTabInfo);

    let matchedTab = findMatchingTab(storedTabInfo, tabId, url, index);

    if (matchedTab) {
        log.debug('matchedTabInfo:', matchedTab);
        await chrome.storage.sync.remove(matchedTab.id.toString());
        matchedTab.id = tabId;
        if (isBeingOpened) {
            matchedTab.isClosed = false;
            matchedTab.closedAt = null;
        }
        await storageSet({[tabId]: matchedTab});
        return matchedTab;
    } else {
        log.debug('No matched tab info found');
        return null;
    }
}

async function saveTab(tab: TabInfo): Promise<void> {
    log.debug('saveTab: called with:', tab);
    const result: TabInfo = await storageGet(tab.id);
    log.debug('saveTab: seeing if a tab info already exists for this tab id:', result);
    let newSignature = Object.assign({}, tab.signature);
    let isClosed = false, closedAt: string | null = null;
    if (result) {
        isClosed = result.isClosed;
        closedAt = result.closedAt;
    }
    log.debug('newSignature after possible overwrite with title and favicon:', newSignature);

    await storageSet({[tab.id]: new TabInfo(tab.id, tab.url, tab.index, isClosed, closedAt, newSignature)});
    log.debug('Data saved to storage');
}

export { findMatchingTab, loadTab, saveTab };       

