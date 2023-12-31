import {ROOT_ELEMENT_ID, INPUT_BOX_ID, OVERLAY_ID,
    FAVICON_PICKER_ID, EMOJI_PICKER_ID, EMOJI_PICKER_IMAGE_ID, PICKED_EMOJI_ID, MAIN_BAR_ID} from "./config";
import { EmojiPicker } from "./emojiPicker";
import listenerManager from "./listenerManager";
import { loadSignature } from "./contentScript";
import { emojiToDataURL, assertType } from "./utils";

export const FAVICON_SIDE_LENTH = 64;
export let isUIInsertedIntoDOM = false;

const htmlContent = `
    <div id="${ROOT_ELEMENT_ID}">
        <div id="${OVERLAY_ID}"></div>
        <div id="${MAIN_BAR_ID}">
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

    // Initialize the values of the input box and the favicon picker based on storage
    const signature = await loadSignature();
    if (signature) {
        if (signature.title) {
            assertType(document.getElementById(INPUT_BOX_ID), HTMLInputElement).value = signature.title;
        }
        if (signature.favicon) {
            setSelectedEmoji(signature.favicon);
        }
    }
    console.log('Called for loadsignature after insertion of UI, got:', signature);

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

/**
 * @param {any} favicon
 */
export function setTabFaviconInUI(favicon) {
    // Check if a favicon link element already exists
    const faviconLinks = document.querySelectorAll("link[rel*='icon']");
    faviconLinks.forEach(link => {
        link.parentNode.removeChild(link);
    });

    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
     // The only supported type of favicon is emojis, so the favicon is assumed to be one.
    const emojiDataURL = emojiToDataURL(favicon, FAVICON_SIDE_LENTH);
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