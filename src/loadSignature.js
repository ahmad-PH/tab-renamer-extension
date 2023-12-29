import { Tab } from "./types";
import { storageGet, storageSet } from "./utils";

/**
 * @param {Object.<number, Tab>} storedTabInfo
 * @param {number} tabId
 * @param {string} url
 * @param {number} index
 * @returns {Tab|null} The tab that matches the given information, or null if no match is found
 */
function findMatchingTab(storedTabInfo, tabId, url, index) {
    if (storedTabInfo[tabId]) {
        return storedTabInfo[tabId];
    } else { // the tab has been closed
        const closedTabsWithMatchingURLs = Object.values(storedTabInfo).filter(
            tabInfoValue => tabInfoValue.isClosed && tabInfoValue.url === url 
        );
        if (closedTabsWithMatchingURLs.length == 1) {
            return closedTabsWithMatchingURLs[0];
        } else if (closedTabsWithMatchingURLs.length > 1) {
            const tabMatchingURLAndIndex = closedTabsWithMatchingURLs.find(tabInfo => tabInfo.index === index);
            if (tabMatchingURLAndIndex) {
                return tabMatchingURLAndIndex;
            } else {
                // find the most recent tab
                closedTabsWithMatchingURLs.sort((tabInfo1, tabInfo2) => {
                    return new Date(tabInfo2.closedAt).valueOf() - new Date(tabInfo1.closedAt).valueOf() 
                });
                return closedTabsWithMatchingURLs[0];
            }
        }
    }
    return null;
}

async function loadSignature(tabId, url, index, isBeingOpened) {
    console.log('loadSignature called:', tabId, url, index, isBeingOpened);
    const storedTabInfo = await storageGet(null);
    console.log('storedTabInfo:', storedTabInfo);

    let matchedTabInfo = findMatchingTab(storedTabInfo, tabId, url, index);

    if (matchedTabInfo) {
        console.log('matchedTabInfo:', matchedTabInfo);
        matchedTabInfo.id = tabId;
        if (isBeingOpened) {
            matchedTabInfo.isClosed = false;
            matchedTabInfo.closedAt = null;
        }
        await storageSet({[tabId]: matchedTabInfo});
        return matchedTabInfo.signature;
    } else {
        console.log('No matched tab info found');
        return null;
    }
}


export { findMatchingTab, loadSignature };       
