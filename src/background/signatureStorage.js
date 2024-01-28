import { Tab, TabSignature } from "../types";
import { storageGet, storageSet } from "../utils";
import { getLogger } from "../log";

const log = getLogger('signatureStorage.js')
// log.setLevel('DEBUG');

/**
 * @param {Object.<number, Tab>} storedTabInfo
 * @param {number} tabId
 * @param {string} url
 * @param {number} index
 * @returns {Tab|null} The tab that matches the given information, or null if no match is found
 */
function findMatchingTab(storedTabInfo, tabId, url, index) {
    log.debug('findMatchingTab called with:', { storedTabInfo, tabId, url, index });

    if (storedTabInfo[tabId]) {
        log.debug('Tab found in storedTabInfo:', storedTabInfo[tabId]);
        return storedTabInfo[tabId];
    } else { // the tab has been closed
        const closedTabsWithMatchingURLs = Object.values(storedTabInfo).filter(
            tabInfoValue => tabInfoValue.isClosed && tabInfoValue.url === url 
        );
        log.debug('closedTabsWithMatchingURLs:', closedTabsWithMatchingURLs);

        if (closedTabsWithMatchingURLs.length == 1) {
            log.debug('One closed tab with matching URL found:', closedTabsWithMatchingURLs[0]);
            return closedTabsWithMatchingURLs[0];
        } else if (closedTabsWithMatchingURLs.length > 1) {
            const tabMatchingURLAndIndex = closedTabsWithMatchingURLs.find(tabInfo => tabInfo.index === index);
            log.debug('tabMatchingURLAndIndex:', tabMatchingURLAndIndex);

            if (tabMatchingURLAndIndex) {
                return tabMatchingURLAndIndex;
            } else {
                // find the most recent tab
                closedTabsWithMatchingURLs.sort((tabInfo1, tabInfo2) => {
                    return new Date(tabInfo2.closedAt).valueOf() - new Date(tabInfo1.closedAt).valueOf() 
                });
                log.debug('Most recent tab:', closedTabsWithMatchingURLs[0]);
                return closedTabsWithMatchingURLs[0];
            }
        }
    }

    log.debug('No matching tab found');
    return null;
}

/**
 * Load the signature of the tab with the given information, from chrome storage.
 * @param {number} tabId
 * @param {string} url
 * @param {number} index
 * @param {boolean} isBeingOpened
 */
async function loadSignature(tabId, url, index, isBeingOpened) {
    // Put a descriptive log logging everyhting with its name:
    log.debug('tabId:', tabId, 'url:', url, 'index:', index, 'isBeingOpened:', isBeingOpened);
    const storedTabInfo = await storageGet(null);
    log.debug('storedTabInfo:', storedTabInfo);

    let matchedTabInfo = findMatchingTab(storedTabInfo, tabId, url, index);

    if (matchedTabInfo) {
        log.debug('matchedTabInfo:', matchedTabInfo);
        await chrome.storage.sync.remove(matchedTabInfo.id.toString());
        matchedTabInfo.id = tabId;
        if (isBeingOpened) {
            matchedTabInfo.isClosed = false;
            matchedTabInfo.closedAt = null;
        }
        await storageSet({[tabId]: matchedTabInfo});
        return matchedTabInfo.signature;
    } else {
        log.debug('No matched tab info found');
        return null;
    }
}

/**
 * @param {number} tabId
 * @param {string} url
 * @param {number} index
 * @param {string} title
 * @param {string} favicon
 */
async function saveSignature(tabId, url, index, title, favicon) {
    log.debug('Function called: saveSignature');
    log.debug('tabId, url, index, title, favicon:', tabId, url, index, title, favicon);
    /** @type {Tab} */
    const result = await storageGet(tabId);
    log.debug('result retrieved:', result);
    let newSignature = new TabSignature(null, null);
    let isClosed = false, closedAt = null;
    if (result) {
        log.debug('result id:', result);
        if (result.signature) {
            newSignature.title = result.signature.title;
            newSignature.favicon = result.signature.favicon;
            log.debug('newSignature after copying from result.signature:', newSignature);
        }
        isClosed = result.isClosed;
        closedAt = result.closedAt;
    }
    newSignature.title = title || newSignature.title;
    newSignature.favicon = favicon || newSignature.favicon;
    log.debug('newSignature after possible overwrite with title and favicon:', newSignature);

    await storageSet({[tabId]: new Tab(tabId, url, index, isClosed, closedAt, newSignature)});
    log.debug('Data saved to storage');
}


export { findMatchingTab, loadSignature, saveSignature };       
