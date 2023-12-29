import { storageGet, storageSet } from "./utils";
import { Tab } from "./types";
import { loadSignature } from "./loadSignature";

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

    if (tabInfo) {
        tabInfo.closed = true;
        tabInfo.closedAt = new Date().toISOString();
        console.log('Added closedAt to it:', tabInfo);
        await storageSet({[tabId]: tabInfo});
    }
});

chrome.tabs.onCreated.addListener(async (tab) => {
    console.log('onCreated called:', tab);
    const signature = await loadSignature(tab.id, tab.url, tab.index, true);
    console.log('found this info:', signature);
    if (signature) {
        chrome.tabs.sendMessage(tab.id, {
            command: 'set_tab_signature',
            signature: signature,
        });
    }
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
            if ((currentTime.valueOf() - tabClosedAt.valueOf()) < 20000) {
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
    let isClosed = false, closedAt = null;
    if (result) {
        console.log('result id:', result);
        if (result.signature) {
            newSignature.title = result.signature.title;
            newSignature.favicon = result.signature.favicon;
            console.log('newSignature after copying from result.signature:', newSignature);
        }
        isClosed = result.closed;
        closedAt = result.closedAt;
    }
    newSignature.title = title || newSignature.title;
    newSignature.favicon = favicon || newSignature.favicon;
    console.log('newSignature after possible overwrite with title and favicon:', newSignature);

    await storageSet({[id]: new Tab(id, url, index, isClosed, closedAt, newSignature)});
    console.log('Data saved to storage');
};
