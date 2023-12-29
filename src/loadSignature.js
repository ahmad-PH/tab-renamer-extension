
/**
 * @param {Object.<number, Tab>} tabInfoList 
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
                    return new Date(tabInfo2.closedAt) - new Date(tabInfo1.closedAt) 
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

    let matchedTabInfo = findMatchingTab(storedTabInfo);

    if (matchedTabInfo) {
        console.log('matchedTabInfo:', matchedTabInfo);
        matchedTabInfo.tabId = tabId;
        if (isBeingOpened) {
            matchedTabInfo.closed = false;
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
