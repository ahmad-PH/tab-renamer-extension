import { preserveTabTitle, preserveFavicon, disconnectTabTitlePreserver, disconnectFaviconPreserver } from "./preservers";
import listenerManager from "./listenerManager";
import { openDialog, closeDialog, setTabTitleInUI, setFaviconInUI } from "./userInterface";
import { INPUT_BOX_ID, PICKED_EMOJI_ID } from "./config";

async function getTabInfo() {
    try {
        return await chrome.runtime.sendMessage({ command: "get_tab_info" });
    } catch (error) {
        console.error('Failed to get tab Info:', error);
        throw error;
    }
}

async function saveSignature(title, favicon) {
    try {
        await chrome.runtime.sendMessage({command: "save_signature", title, favicon});
    } catch (error) {
        console.log('Failed to save signature:', error);
        throw error;
    }
}

async function loadSignature() {
    try {
        return await chrome.runtime.sendMessage({command: "load_signature"});
    } catch (error) {
        console.log('Failed to save signature:', error);
        throw error;
    }
}

async function getTabId() {
    (await getTabInfo()).id;
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

window.addEventListener('uiInsertedIntoDOM', () => {
    const inputBox = document.getElementById(INPUT_BOX_ID);
    const pickedEmoji = document.getElementById(PICKED_EMOJI_ID);
    listenerManager.addDOMListener(inputBox, "keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            console.log('keydown thingy called');
            setTabTitle(inputBox.value);
            if (pickedEmoji.dataset.emoji !== undefined) {
                setFavicon(pickedEmoji.dataset.emoji);
            }
            closeDialog();
        }
    });
});

async function updateTabSignatureFromStorage() {
    console.log('updateTabSignatureFromStorage called');
    const signature = await loadSignature();
    if (signature) {
        console.log('retrieved signature:', signature);
        if (signature.title) {
            setTabTitle(signature.title);
        }
        if (signature.favicon) {
            setFavicon(signature.favicon);
        }
    } else {
        console.log('no signature found');
    }
}

// Update tab signature when the contentScript loads:
updateTabSignatureFromStorage();

listenerManager.addChromeListener(chrome.runtime.onMessage, 
    async (message, sender, sendResponse) => {
        if (message.command === 'open_rename_dialog') {
            await openDialog();
        } else if (message.command === 'set_tab_signature') {
            console.log('Received set_tab_signature command, with message:', message);
            setTabTitle(message.signature.title);
            setFavicon(message.signature.favicon);
        }
    }
);

listenerManager.addDOMListener(document, 'openRenameDialog', async () => {
    await openDialog();
});

// For debugging purposes:
const debugFunction = async () => {
    chrome.storage.sync.get(null, (items) => {
        console.log('storage:');
        console.log(items);
    });
    console.log(loadSignature());
};

document.addEventListener('DOMContentLoaded', (event) => {
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



