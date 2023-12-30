import { preserveTabTitle, preserveFavicon, disconnectTabTitlePreserver, disconnectFaviconPreserver } from "./preservers";
import listenerManager from "./listenerManager";
import { openDialog, closeDialog, setTabTitleInUI, setFaviconInUI } from "./userInterface";
import { INPUT_BOX_ID, PICKED_EMOJI_ID, ROOT_ELEMENT_ID } from "./config";
import { assertType } from "./utils";
import log from "./log";

// eslint-disable-next-line no-unused-vars
async function getTabInfo() {
    try {
        return await chrome.runtime.sendMessage({ command: "get_tab_info" });
    } catch (error) {
        console.error('Failed to get tab Info:', error);
        throw error;
    }
}

// eslint-disable-next-line no-unused-vars
async function getTabId() {
    (await getTabInfo()).id;
}

async function saveSignature(title, favicon) {
    try {
        await chrome.runtime.sendMessage({command: "save_signature", title, favicon});
    } catch (error) {
        log.error('Failed to save signature:', error);
        throw error;
    }
}

async function loadSignature() {
    try {
        return await chrome.runtime.sendMessage({command: "load_signature"});
    } catch (error) {
        log.error('Failed to save signature:', error);
        throw error;
    }
}

async function setTabTitle(newTabTitle) {
    preserveTabTitle(newTabTitle);
    setTabTitleInUI(newTabTitle);
    await saveSignature(newTabTitle, null);
}

function setFavicon(favicon) {
    const emojiDataURL = setFaviconInUI(favicon);
    saveSignature(null, favicon);
    preserveFavicon(emojiDataURL);
}

// ========================= Window events: ==========================
window.addEventListener('uiInsertedIntoDOM', () => {
    /** @type {HTMLInputElement} */
    const inputBox = assertType(document.getElementById(INPUT_BOX_ID), HTMLInputElement);
    const pickedEmoji = document.getElementById(PICKED_EMOJI_ID);
    listenerManager.addDOMListener(inputBox, "keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            HTMLInputElement
            setTabTitle(inputBox.value);
            if (pickedEmoji.dataset.emoji !== undefined) {
                setFavicon(pickedEmoji.dataset.emoji);
            }
            closeDialog();
        }
    });
});

// ========================= Chrome.runtime events: ==========================
listenerManager.addChromeListener(chrome.runtime.onMessage, 
    async (message, _sender, _sendResponse) => {
        if (message.command === 'open_rename_dialog') {
            await openDialog();
        } else if (message.command === 'set_tab_signature') {
            setTabTitle(message.signature.title);
            setFavicon(message.signature.favicon);
        }
    }
);

// ========================= DOM events: ==========================
listenerManager.addDOMListener(document, 'openRenameDialog', async () => {
    await openDialog();
});

// For debugging purposes:
const debugFunction = async () => {
    chrome.storage.sync.get(null, (items) => {
        log.debug('storage:');
        log.debug(items);
    });
    log.debug(loadSignature());
};

document.addEventListener('DOMContentLoaded', () => {
    listenerManager.addDOMListener(document.body, 'click', debugFunction);
});

// Cleaning-up logic for when the extension unloads/reloads.
const runtimePort = chrome.runtime.connect({ name: "content-script" });
runtimePort.onDisconnect.addListener(() => {
    listenerManager.removeAllListeners();
    document.body.removeEventListener('click', debugFunction);

    disconnectTabTitlePreserver();
    disconnectFaviconPreserver();

    const rootElement = document.getElementById(ROOT_ELEMENT_ID);
    if (rootElement) {
        rootElement.remove();
    }
});



/** Update tab signature when the contentScript loads:
 *  This is an immediately invoked function expression (IIFE)
 */ 
(async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called');
    const signature = await loadSignature();
    if (signature) {
        log.debug('retrieved signature:', signature);
        if (signature.title) {
            setTabTitle(signature.title);
        }
        if (signature.favicon) {
            setFavicon(signature.favicon);
        }
    } else {
        log.debug('no signature found');
    }
})();



