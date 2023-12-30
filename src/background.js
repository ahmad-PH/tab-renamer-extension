import { storageGet, storageSet } from "./utils";
import { Tab } from "./types";
import { loadSignature, saveSignature } from "./signatureStorage";
import log from "./log";

chrome.commands.onCommand.addListener((command) => {
    if (command === "open_rename_dialog") {
        chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {
                command: 'open_rename_dialog',
                tabId: tabs[0].id
            });
        }).catch(error => 
            {log.error('query error', error);}
        );
    }
});

// Listen for any messages from content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "get_tab_info") {
        sendResponse({ id: sender.tab.id,  url: sender.tab.url, index: sender.tab.index});
    } else if (message.command === "save_signature") {
        saveSignature(sender.tab.id, sender.tab.url, sender.tab.index, message.title, message.favicon);
    } else if (message.command === "load_signature") {
        loadSignature(sender.tab.id, sender.tab.url, sender.tab.index, false)
        .then((resp) => {
            sendResponse(resp);
        });
        return true; // To indicate that the response will be asynchronous
    }
});

chrome.tabs.onRemoved.addListener(async function(tabId, removeInfo) {
    log.debug('onRemoved listener called:');
    log.debug('tab closed:', tabId, removeInfo);

    /** @type {Tab} */
    let tabInfo = await storageGet(tabId);
    log.debug('retrieved tab Info', tabInfo);

    if (tabInfo) {
        tabInfo.isClosed = true;
        tabInfo.closedAt = new Date().toISOString();
        log.debug('Added closedAt to it:', tabInfo);
        await storageSet({[tabId]: tabInfo});
    }
});

chrome.tabs.onCreated.addListener(async (tab) => {
    log.debug('onCreated called:', tab);
    const signature = await loadSignature(tab.id, tab.url, tab.index, true);
    log.debug('found this info:', signature);
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
    log.debug('after query:', allTabs);
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
                log.error('error while processing', tab.url);
                log.error(e);
            }
        }
    });
});

chrome.runtime.onConnect.addListener((port) => {
    console.assert(port.name === "content-script");
    log.debug('Connection with content script established successfully.');
});


const gcLog = require("loglevel").getLogger("module-one")
gcLog.setLevel("SILENT");

async function garbageCollector() {
    gcLog.debug('Garbage collector called at', new Date().toISOString());
    const allTabInfo = await storageGet(null);  // Added await here
    gcLog.debug('Retrieved all tab info:', JSON.stringify(allTabInfo, null, 2));
    let infoToKeep = {};
    const currentTime = new Date();
    gcLog.debug('Current time:', currentTime);

    for (const [tabId, tabInfo] of Object.entries(allTabInfo)) {
        gcLog.debug(`Processing tabId: ${tabId}`);
        let keep = false;
        if (tabInfo.closed === false) {
            gcLog.debug(`Tab ${tabId} is not closed, keeping...`);
            keep = true;
        } else {
            const tabClosedAt = new Date(tabInfo.closedAt);
            gcLog.debug(`Tab ${tabId} closed at: ${tabClosedAt}`);
            if ((currentTime.valueOf() - tabClosedAt.valueOf()) < 20000) {
                gcLog.debug(`Tab ${tabId} was closed less than 20 seconds ago, keeping...`);
                keep = true;
            } else {
                gcLog.debug(`Tab ${tabId} was closed more than 20 seconds ago, discarding...`);
            }
        }

        if (keep) {
            infoToKeep[tabId] = tabInfo;
        }
    }

    gcLog.debug('Info to keep:', JSON.stringify(infoToKeep, null, 2));
    await storageSet(infoToKeep);
    gcLog.debug('Updated storage with info to keep at', new Date().toISOString());
    console.debug();
}

setInterval(garbageCollector, 5000);
