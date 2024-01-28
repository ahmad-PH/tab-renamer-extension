import { storageGet, storageSet } from "../utils";
import { Tab } from "../types";
import { loadSignature, saveSignature } from "./signatureStorage";
import { getLogger } from "../log";
import { startTheGarbageCollector } from "./garbageCollector";
import { EVENT_OPEN_RENAME_DIALOG } from "../config";

const log = getLogger('background.js');
log.setLevel('DEBUG');

chrome.commands.onCommand.addListener((command) => {
    if (command === EVENT_OPEN_RENAME_DIALOG) {
        chrome.tabs.query({active: true, currentWindow: true}).then(tabs => {
            return chrome.tabs.sendMessage(tabs[0].id, {
                command: EVENT_OPEN_RENAME_DIALOG,
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
            return sendResponse(resp);
        }).catch(e => {
            log.error('Error while loading signature:', e);
            return sendResponse(null);
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
    const allTabs = await chrome.tabs.query({status: 'complete'});
    log.debug('after query:', allTabs);
    allTabs.forEach(async (tab) => {
        if (
            (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
            !tab.url.startsWith('https://chrome.google.com/webstore/devconsole') // The extensions gallery cannot be scripted 
        ) { 
            try {
                await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    files: ['contentScript.js']
                });
            } catch (e) {
                log.error('Error while injecting the extension into: ', tab.url, e);
            }
        }
    });
});

chrome.runtime.onConnect.addListener((port) => {
    console.assert(port.name === "content-script");
    log.debug('Connection with content script established successfully.');
});

startTheGarbageCollector();
