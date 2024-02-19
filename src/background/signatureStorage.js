import { TabInfo } from "../types";
import { storageGet, storageSet } from "../utils";
import { getLogger } from "../log";

const log = getLogger('signatureStorage.js');
// log.setLevel('DEBUG');

/**
 * @param {Object.<number, TabInfo>} storedTabInfo
 * @param {number} tabId
 * @param {string} url
 * @param {number} index
 * @returns {TabInfo|null} The tab that matches the given information, or null if no match is found
 */
function findMatchingTab(storedTabInfo, tabId, url, index) {
    log.debug('findMatchingTab called with:', { storedTabInfo, tabId, url, index });

    if (storedTabInfo[tabId]) {
        log.debug('Tab found in storedTabInfo:', storedTabInfo[tabId]);
        return storedTabInfo[tabId];
    } else { // the tab has been closed
        const candidateTabs = Object.values(storedTabInfo).filter(
            tabInfoValue => (tabInfoValue.isClosed || tabInfoValue.isDiscarded) && tabInfoValue.url === url 
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
                // find the most recent tab
                candidateTabs.sort((tabInfo1, tabInfo2) => {
                    return new Date(tabInfo2.closedAt).valueOf() - new Date(tabInfo1.closedAt).valueOf() 
                });
                log.debug('Most recent tab:', candidateTabs[0]);
                return candidateTabs[0];
            }
        }
    }

    log.debug('No matching tab found');
    return null;
}

/**
 * Load the tab with the given information, from chrome storage.
 * @param {number} tabId
 * @param {string} url
 * @param {number} index
 * @param {boolean} isBeingOpened
 * @returns {Promise<TabInfo|null>} The tab matching the given information.
 */
async function loadTab(tabId, url, index, isBeingOpened) {
    // Put a descriptive log logging everyhting with its name:
    log.debug('tabId:', tabId, 'url:', url, 'index:', index, 'isBeingOpened:', isBeingOpened);
    const storedTabInfo = await storageGet(null);
    log.debug('storedTabInfo:', storedTabInfo);

    let matchedTab = findMatchingTab(storedTabInfo, tabId, url, index);

    if (matchedTab) {
        log.debug('matchedTabInfo:', matchedTab);
        await chrome.storage.sync.remove(matchedTab.id.toString());
        matchedTab.id = tabId;
        if (isBeingOpened) {
            matchedTab.isClosed = false;
            matchedTab.closedAt = null;
            matchedTab.isDiscarded = false;
        }
        await storageSet({[tabId]: matchedTab});
        return matchedTab;
    } else {
        log.debug('No matched tab info found');
        return null;
    }
}

/**
 * @param {TabInfo} tab
 */
async function saveTab(tab) {
    log.debug('Function called: saveSignature');
    log.debug('tab:', tab);
    /** @type {TabInfo} */
    const result = await storageGet(tab.id);
    log.debug('result retrieved:', result);
    let newSignature = Object.assign({}, tab.signature);
    let isClosed = false, closedAt = null;
    if (result) {
        isClosed = result.isClosed;
        closedAt = result.closedAt;
    }
    log.debug('newSignature after possible overwrite with title and favicon:', newSignature);

    await storageSet({[tab.id]: new TabInfo(tab.id, tab.url, tab.index, isClosed, closedAt, newSignature, tab.isDiscarded)});
    log.debug('Data saved to storage');
}


export { findMatchingTab, loadTab, saveTab };       
