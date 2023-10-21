import { EmojiPicker } from "./emojiPicker";
import { storageSet, storageGet, emojiToDataURL } from "./utils";
import { preserveTabTitle, preserveFavicon, disconnectTabTitlePreserver, disconnectFaviconPreserver } from "./preservers";
import listenerManager from "./listenerManager";

const EXTENSION_PREFIX = "tab-renamer-extension"
const ROOT_ELEMENT_ID = `${EXTENSION_PREFIX}-root`;
const INPUT_BOX_ID = `${EXTENSION_PREFIX}-input-box`;
const OVERLAY_ID = `${EXTENSION_PREFIX}-overlay`;
const FAVICON_PICKER_ID = "tab-renamer-extension-favicon-picker";
const EMOJI_PICKER_ID = `${EXTENSION_PREFIX}-emoji-picker`;
const EMOJI_PICKER_IMAGE_ID = `${EXTENSION_PREFIX}-emoji-picker-image`;
const PICKED_EMOJI_ID = `${EXTENSION_PREFIX}-picked-emoji`;

const tabId = getTabId();

const htmlContent = `
    <div id="${ROOT_ELEMENT_ID}">
        <div id="${OVERLAY_ID}"></div>
        <div id="tab-renamer-extension-input-container">
            <div id="tab-renamer-extension-favicon-picker-wrapper"/>
                <div id="${FAVICON_PICKER_ID}">
                    <img id="${EMOJI_PICKER_IMAGE_ID}"/>
                    <img id="${PICKED_EMOJI_ID}" style="display:none"/>
                </div>
                <div id="${EMOJI_PICKER_ID}"> </div>
            </div>
            <input type="text" id="${INPUT_BOX_ID}" placeholder="New Tab Name" autocomplete="off"/>
        </div>
    </div>
`;

let isUIInsertedIntoDOM = false;

function setUIVisibility(visible) {
    const newDisplay = visible? "block": "none";
    document.getElementById(ROOT_ELEMENT_ID).style.display = newDisplay;
    if (visible) {
        document.getElementById(INPUT_BOX_ID).focus();
    }
}

function insertUIIntoDOM() {
    document.body.insertAdjacentHTML('beforeend', htmlContent);
    document.getElementById(EMOJI_PICKER_IMAGE_ID).src = chrome.runtime.getURL("assets/emoji_picker_icon.png");

    const emojiPicker = new EmojiPicker(EMOJI_PICKER_ID, emojiPickCallback);
    emojiPicker.insertIntoDOM();

    // Add Enter key listener to change the tab name
    const inputBox = document.getElementById(INPUT_BOX_ID);
    const pickedEmoji = document.getElementById(PICKED_EMOJI_ID);
    listenerManager.addDOMListener(inputBox, "keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            setTabTitle(inputBox.value);
            if (pickedEmoji.dataset.emoji !== undefined) {
                setFavicon(pickedEmoji.dataset.emoji);
            }
            closeDialog();
        }
    });
    
    listenerManager.addDOMListener(document.getElementById(FAVICON_PICKER_ID), "click", () => {
        emojiPicker.setVisibility(!emojiPicker.isVisible);
        emojiPicker.focusTheSearchBar();
    });

    listenerManager.addDOMListener(document, "keydown", function(event) {
        if (event.key === "Escape") {
            closeDialog();
        }
    });

    // Close the UI if clicked outside inputBox
    listenerManager.addDOMListener(document.getElementById(OVERLAY_ID), "click", () => {
        closeDialog();
    });

    // Prevent clicks on the input box from propagating to the overlay
    listenerManager.addDOMListener(inputBox, "click", (event) => {
        event.stopPropagation();
    });

    closeDialog();
}

function emojiPickCallback(emoji) {
    document.getElementById(EMOJI_PICKER_IMAGE_ID).style.display = 'none';
    document.getElementById(EMOJI_PICKER_ID).style.display = 'none';

    const emojiImg = document.getElementById(PICKED_EMOJI_ID);
    emojiImg.src = emojiToDataURL(emoji, 55);
    emojiImg.style.display = 'block';
    emojiImg.dataset.emoji = emoji;
}

function clearInputs() {
    clearInputTabTitle();
    clearPickedEmoji();
}

function clearInputTabTitle() {
    document.getElementById(INPUT_BOX_ID).value = "";
}

function clearPickedEmoji() {
    document.getElementById(PICKED_EMOJI_ID).style.display = 'none';
    document.getElementById(EMOJI_PICKER_IMAGE_ID).style.display = 'block';
}

function closeDialog() {
    setUIVisibility(false);
}

function openDialog() {
    if (!isUIInsertedIntoDOM) {
        insertUIIntoDOM();
        isUIInsertedIntoDOM = true;
    }
    setUIVisibility(true);
}

async function getTabInfo() {
    try {
        const response = await chrome.runtime.sendMessage({ command: "get_tab_info" });
        if (response) {
            return response;
        } else {
            throw new Error('Invalid response from background script.');
        }
    } catch (error) {
        console.error('Failed to get tab Info:', error);
        throw error;
    }
}

async function getTabId() {
    (await getTabInfo()).id;
}

function setTabTitle(newTabTitle) {
    document.title = newTabTitle;
    // saveSignature(newTabTitle, null);
    preserveTabTitle(newTabTitle);
}

function setFavicon(emoji) {
    // Check if a favicon link element already exists
    const faviconLinks = document.querySelectorAll("link[rel*='icon']");
    faviconLinks.forEach(link => {
        link.parentNode.removeChild(link);
    });

    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    const emojiDataURL = emojiToDataURL(emoji, 64);
    link.href = emojiDataURL;
    document.getElementsByTagName('head')[0].appendChild(link);

    // saveSignature(null, emoji);
    preserveFavicon(emojiDataURL);
}

async function updateTabSignatureFromStorage() {
    const titleKey = `${tabId}_title`;
    chrome.storage.sync.get([titleKey], function(result) {
        if (result[titleKey]) {
            setTabTitle(result[titleKey]);
        }
    });

    const faviconKey = `${tabId}_favicon`;
    chrome.storage.sync.get([faviconKey], function(result) {
        if (result[faviconKey]) {
            setFavicon(result[faviconKey]);
        }
    });
}

async function saveSignature(title, favicon) {
    const {id, url, index} = await getTabInfo();
    const result = await storageGet([`${id}`]);
    console.log('result retrieved:', result);
    let newSignature = {};
    if (result[id]) {
        console.log('result id:', result[id]);
        if (result[id].signature) {
            newSignature.title = result[id].signature.title;
            newSignature.favicon = result[id].signature.favicon;
        }
    }
    newSignature.title = title || newSignature.title;
    newSignature.favicon = favicon || newSignature.favicon;

    await storageSet({[id]: {
        'id': id,
        'url': url,
        'index': index,
        'closedAtTime': null,
        'signature': newSignature
    }});
};

async function getSignature() {
    const {id, url, index} = await getTabInfo();
    const data = storageGet(null);
}

listenerManager.addRuntimeListener((message, sender, sendResponse) => {
    if (message.command === "open_rename_dialog") {
        openDialog();
    }
});

// Update tab signature when the contentScript loads:
updateTabSignatureFromStorage();

// For debugging purposes:
const debugFunction = async () => {
    chrome.storage.sync.get(null, (items) => {
        console.log('storage:');
        console.log(items);
    });
    console.log(getSignature());
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
