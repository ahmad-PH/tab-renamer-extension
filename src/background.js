import { storageGet, storageSet } from "./utils";

chrome.commands.onCommand.addListener((command) => {
    if (command === "open_rename_dialog") {
        chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
            console.log('tabs returned:', tabs);
            chrome.tabs.sendMessage(tabs[0].id, {
                command: 'open_rename_dialog',
                tabId: tabs[0].id
            });
        }).catch(error => 
            {console.log('query error', error);}
        );
    }
});

// Listen for any messages from content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "get_tab_info") {
        sendResponse({ id: sender.tab.id,  url: sender.tab.url, index: sender.tab.index});
    } else if (message.command === "save_signature") {
        saveSignature(sender, message.title, message.favicon);
    } else if (message.command === "load_signature") {
        loadSignature(sender.tab.id, sender.tab.url, sender.tab.index, false)
        .then((resp) => {
            console.log('load_signature response is:', resp);
            sendResponse(resp);
        });
        return true; // To indicate that the response will be asynchronous
    }
});

chrome.tabs.onRemoved.addListener(async function(tabId, removeInfo) {
    console.log('onRemoved listener called');
    console.log('tab closed:', tabId, removeInfo);

    let tabInfo = await storageGet(tabId);
    console.log('retrieved tab Info', tabInfo);

    tabInfo.closed = true;
    tabInfo.closedAt = new Date().toISOString();
    console.log('Added closedAt to it:', tabInfo);
    await storageSet({[tabId]: tabInfo});
});

chrome.tabs.onCreated.addListener(async (tab) => {
    console.log('onCreated called:', tab);
    const signature = await loadSignature(tab.id, tab.url, tab.index, true);
    console.log('found this info:', signature);
    chrome.tabs.sendMessage(tab.id, {
        command: 'set_tab_signature',
        signature: signature,
    });
});

// Might be needed later, for making sure the contentScript gets injected when
// the extension is installed or updated:
chrome.runtime.onInstalled.addListener(async () => {
    const allTabs = await chrome.tabs.query({});
    console.log('after query:', allTabs);
    allTabs.forEach(async (tab) => {
        if (!tab.url.startsWith('chrome://')) { // These urls are browser-protected
            try {
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    files: ['contentScript.js']
                });
                await chrome.scripting.insertCSS({
                    target: {tabId: tab.id},
                    files: ['assets/styles.css']
                });
            } catch (e) {
                console.log('error while processing', tab.url);
                console.log(e);
            }
        }
    });
});

chrome.runtime.onConnect.addListener((port) => {
    console.assert(port.name === "content-script");
    console.log('Connection with content script established successfully.');
});

let debug = false;

function logDebug(...args) {
    if (debug) {
        console.log(...args);
    }
}

async function garbageCollector() {
    logDebug('Garbage collector called at', new Date().toISOString());
    const allTabInfo = await storageGet(null);  // Added await here
    logDebug('Retrieved all tab info:', JSON.stringify(allTabInfo, null, 2));
    let infoToKeep = {};
    const currentTime = new Date();
    logDebug('Current time:', currentTime);

    for (const [tabId, tabInfo] of Object.entries(allTabInfo)) {
        logDebug(`Processing tabId: ${tabId}`);
        let keep = false;
        if (tabInfo.closed === false) {
            logDebug(`Tab ${tabId} is not closed, keeping...`);
            keep = true;
        } else {
            const tabClosedAt = new Date(tabInfo.closedAt);
            logDebug(`Tab ${tabId} closed at: ${tabClosedAt}`);
            if ((currentTime - tabClosedAt) < 20000) {
                logDebug(`Tab ${tabId} was closed less than 20 seconds ago, keeping...`);
                keep = true;
            } else {
                logDebug(`Tab ${tabId} was closed more than 20 seconds ago, discarding...`);
            }
        }

        if (keep) {
            infoToKeep[tabId] = tabInfo;
        }
    }

    logDebug('Info to keep:', JSON.stringify(infoToKeep, null, 2));
    await storageSet(infoToKeep);
    logDebug('Updated storage with info to keep at', new Date().toISOString());
    console.debug();
}

setInterval(garbageCollector, 5000);
async function saveSignature(sender, title, favicon) {
    console.log('Function called: saveSignature');
    const [id, url, index] = [sender.tab.id, sender.tab.url, sender.tab.index];
    console.log('id, url, index:', id, url, index);
    const result = await storageGet(id);
    console.log('result retrieved:', result);
    let newSignature = {};
    let closed = false, closedAt = null;
    if (result) {
        console.log('result id:', result);
        if (result.signature) {
            newSignature.title = result.signature.title;
            newSignature.favicon = result.signature.favicon;
            console.log('newSignature after copying from result.signature:', newSignature);
        }
        closed = result.closed;
        closedAt = result.closedAt;
    }
    newSignature.title = title || newSignature.title;
    newSignature.favicon = favicon || newSignature.favicon;
    console.log('newSignature after possible overwrite with title and favicon:', newSignature);

    await storageSet({[id]: {
        'id': id,
        'url': url,
        'index': index,
        'signature': newSignature,
        'closed': closed,
        'closedAt': closedAt,
    }});
    console.log('Data saved to storage');
};

async function loadSignature(tabId, url, index, isBeingOpened) {
    console.log('Function called: loadSignature');
    const storedTabInfo = await storageGet(null);
    console.log('storedTabInfo:', storedTabInfo);
    let matchedTabInfo = null;
    console.log('tabId', tabId);
    if (storedTabInfo[tabId]) {
        console.log('found data at current tab id:');
        console.log(storedTabInfo[tabId]);
        matchedTabInfo = storedTabInfo[tabId];
    } else { // the tab has been closed
        console.log('Tab has been closed, searching for matching data...');
        const closedTabsWithMatchingURLs = Object.values(storedTabInfo).filter(
            tabInfoValue => tabInfoValue.closed && tabInfoValue.url === url 
        );
        console.log('closedTabsWithMatchingURLs:', closedTabsWithMatchingURLs);
        if (closedTabsWithMatchingURLs.length == 1) {
            matchedTabInfo = closedTabsWithMatchingURLs[0];
        } else if (closedTabsWithMatchingURLs.length > 1) {
            console.log('Multiple closed tabs with matching URLs found');
            const tabMatchingURLAndIndex = closedTabsWithMatchingURLs.find(tabInfo => tabInfo.index === index);
            if (tabMatchingURLAndIndex) {
                matchedTabInfo = tabMatchingURLAndIndex;
            } else {
                // find the most recent tab
                console.log('Sorting to find the most recent tab');
                closedTabsWithMatchingURLs.sort((tabInfo1, tabInfo2) => {
                    return new Date(tabInfo2.recordedAtISOString) - new Date(tabInfo1.recordedAtISOString) 
                });
                matchedTabInfo = closedTabsWithMatchingURLs[0];
            }
        } else {
            console.log('Found no matching tab at all');
        }
    }

    if (matchedTabInfo) {
        console.log('matchedTabInfo:', matchedTabInfo);
        matchedTabInfo.tabId = tabId;
        if (isBeingOpened) {
            matchedTabInfo.closed = false;
            matchedTabInfo.closedAt = null;
        }
        await storageSet({[tabId]: matchedTabInfo});
        console.log('Returning signature: ', matchedTabInfo.signature);
        return matchedTabInfo.signature;
    } else {
        console.log('No matched tab info found');
        return null;
    }
}
       
