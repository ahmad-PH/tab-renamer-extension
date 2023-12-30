import {ROOT_ELEMENT_ID, INPUT_BOX_ID, OVERLAY_ID,
    FAVICON_PICKER_ID, EMOJI_PICKER_ID, EMOJI_PICKER_IMAGE_ID, PICKED_EMOJI_ID} from "./config";
import { EmojiPicker } from "./emojiPicker";
import listenerManager from "./listenerManager";
import { emojiToDataURL, assertType } from "./utils";

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

export let isUIInsertedIntoDOM = false;

function setUIVisibility(visible) {
    const newDisplay = visible? "block": "none";
    document.getElementById(ROOT_ELEMENT_ID).style.display = newDisplay;
    if (visible) {
        document.getElementById(INPUT_BOX_ID).focus();
    }
}

async function insertUIIntoDOM() {
    document.body.insertAdjacentHTML('beforeend', htmlContent);
    const emojiPickerImage = assertType(document.getElementById(EMOJI_PICKER_IMAGE_ID), HTMLImageElement);
    emojiPickerImage.src = chrome.runtime.getURL("assets/emoji_picker_icon.png");

    const emojiPicker = new EmojiPicker(EMOJI_PICKER_ID, setSelectedEmoji);
    await emojiPicker.initialize();
    emojiPicker.insertIntoDOM();
    
    listenerManager.addDOMListener(document.getElementById(FAVICON_PICKER_ID), "click", () => {
        emojiPicker.setVisibility(!emojiPicker.isVisible);
        emojiPicker.focusTheSearchBar();
    });

    listenerManager.addDOMListener(document, "keydown", function(/** @type {{ key: string; }} */ event) {
        if (event.key === "Escape") {
            closeDialog();
        }
    });

    // Close the UI if clicked outside inputBox
    listenerManager.addDOMListener(document.getElementById(OVERLAY_ID), "click", () => {
        closeDialog();
    });

    // Prevent clicks on the input box from propagating to the overlay
    listenerManager.addDOMListener(document.getElementById(INPUT_BOX_ID), "click", (/** @type {{ stopPropagation: () => void; }} */ event) => {
        event.stopPropagation();
    });

    closeDialog();

    window.dispatchEvent(new CustomEvent('uiInsertedIntoDOM'));
}

/**
 * @param {string} emoji
 */
function setSelectedEmoji(emoji) {
    document.getElementById(EMOJI_PICKER_IMAGE_ID).style.display = 'none';
    document.getElementById(EMOJI_PICKER_ID).style.display = 'none';

    const emojiImg = assertType(document.getElementById(PICKED_EMOJI_ID), HTMLImageElement);
    emojiImg.src = emojiToDataURL(emoji, 55);
    emojiImg.style.display = 'block';
    emojiImg.dataset.emoji = emoji;
}

/**
 * @param {string} newTabTitle
 */
export function setTabTitleInUI(newTabTitle) {
    document.title = newTabTitle;
}

export const faviconSideLength = 64;

/**
 * @param {any} favicon
 */
export function setFaviconInUI(favicon) {
    // Check if a favicon link element already exists
    const faviconLinks = document.querySelectorAll("link[rel*='icon']");
    faviconLinks.forEach(link => {
        link.parentNode.removeChild(link);
    });

    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
     // The only supported type of favicon is emojis, so the favicon is assumed to be one.
    const emojiDataURL = emojiToDataURL(favicon, faviconSideLength);
    link.href = emojiDataURL;
    document.getElementsByTagName('head')[0].appendChild(link);

    return emojiDataURL;
}

// eslint-disable-next-line no-unused-vars
function clearInputs() {
    clearInputTabTitle();
    clearPickedEmoji();
}

function clearInputTabTitle() {
   assertType(document.getElementById(INPUT_BOX_ID), HTMLInputElement).value = "";
}

function clearPickedEmoji() {
    document.getElementById(PICKED_EMOJI_ID).style.display = 'none';
    document.getElementById(EMOJI_PICKER_IMAGE_ID).style.display = 'block';
}

export function closeDialog() {
    setUIVisibility(false);
}

export async function openDialog() {
    if (!isUIInsertedIntoDOM) {
        await insertUIIntoDOM();
        isUIInsertedIntoDOM = true;
    }
    setUIVisibility(true);
}