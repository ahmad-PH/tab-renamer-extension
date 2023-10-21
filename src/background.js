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
    }
  });

chrome.tabs.onRemoved.addListener(async function(tabId, removeInfo) {
    console.log('onRemoved listener called');
    console.log('tab closed:', tabId, removeInfo);

    let tabInfo = await storageGet(tabId);
    console.log('retrieved tab Info', tabInfo);

    tabInfo.closedAt = new Date().toISOString();
    console.log('Added closedAt to it:', tabInfo);
    await storageSet({[tabId]: tabInfo});
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

let debug = true;

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
}

setInterval(garbageCollector, 5000);
