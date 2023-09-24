import { EmojiPicker } from "./emojiPicker";
import { emojiToDataURL } from "./utils";

const EXTENSION_PREFIX = "tab-renamer-extension"
const ROOT_ELEMENT_ID = `${EXTENSION_PREFIX}-root`;
const INPUT_BOX_ID = `${EXTENSION_PREFIX}-input-box`;
const OVERLAY_ID = `${EXTENSION_PREFIX}-overlay`;
const FAVICON_PICKER_ID = "tab-renamer-extension-favicon-picker";
const EMOJI_PICKER_ID = `${EXTENSION_PREFIX}-emoji-picker`;
const EMOJI_PICKER_IMAGE_ID = `${EXTENSION_PREFIX}-emoji-picker-image`;
const PICKED_EMOJI_ID = `${EXTENSION_PREFIX}-picked-emoji`;

let tabMutationObserver = null;
let selectedEmoji = null;
let faviconMutationObserver = null;
let currentFaviconLinkElement = null;

function setTabTitle(newTabTitle, tabId) {
    document.title = newTabTitle;
    chrome.storage.sync.set({[`${tabId}_title`]: newTabTitle});
    preserveTabTitle(newTabTitle);
}

function setFavicon(emoji, tabId) {
    // Check if a favicon link element already exists
    let link = document.querySelector("link[rel*='icon']");

    // Create the link element if it doesn't exist
    if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
        currentFaviconLinkElement = link;
    }

    // Set the favicon
    const emojiDataURL = emojiToDataURL(emoji, 64);
    link.href = emojiDataURL;

    chrome.storage.sync.set({[`${tabId}_favicon`]: emoji});
    preserveFavicon(emojiDataURL);
}


/* This function seems to be only required when:
 * 1- Clicking on a link that changes the tab
 * 2- On websites like Facebook that keep enforing their own title
 */
function preserveTabTitle(desiredTitle) {
    // Disconnect the previous observer if it exists, to avoid an infinite loop.    
    if (tabMutationObserver) {
        tabMutationObserver.disconnect();
    }

    tabMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.nodeName === 'TITLE') {
                const newTitle = document.title;
                if (newTitle !== desiredTitle) {
                    document.title = desiredTitle;
                }
            }
        });
    });
  
    const titleElement = document.querySelector('head > title');
    if (titleElement) {
        tabMutationObserver.observe(titleElement, { subtree: true, characterData: true, childList: true });
    }
};

function preserveFavicon(emojiDataURL) {
    // Disconnect the previous observer if it exists, to avoid infinite loop.
    if (faviconMutationObserver) {
        faviconMutationObserver.disconnect();
    }

    faviconMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const target = mutation.target;
            if (target.nodeName === 'LINK' && target.rel.includes('icon')) {
                if (target.href !== emojiDataURL) {
                    target.href = emojiDataURL;
                }
            }
        });
    });

    const headElement = document.querySelector('head');
    if (headElement) {
        faviconMutationObserver.observe(headElement, { subtree: true, childList: true, attributes: true });
    }
}

function setUIVisibility(visible) {
    const newDisplay = visible? "block": "none";
    document.getElementById(ROOT_ELEMENT_ID).style.display = newDisplay;
    if (visible) {
        document.getElementById(INPUT_BOX_ID).focus();
    }
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.command === "open_rename_dialog") {
            if (!document.getElementById(INPUT_BOX_ID)) {
                let htmlContent = `
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
                document.body.insertAdjacentHTML('beforeend', htmlContent);
                document.getElementById(EMOJI_PICKER_IMAGE_ID).src = chrome.runtime.getURL("assets/emoji_picker_icon.png");

                const emojiPicker = new EmojiPicker(EMOJI_PICKER_ID, emojiPickCallback);
                emojiPicker.insertIntoDOM();

                // Add Enter key listener to change the tab name
                const inputBox = document.getElementById(INPUT_BOX_ID);
                const pickedEmoji = document.getElementById(PICKED_EMOJI_ID);
                inputBox.addEventListener("keydown", function(event) {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        setTabTitle(inputBox.value, message.tabId);
                        if (pickedEmoji.dataset.emoji !== undefined) {
                            setFavicon(pickedEmoji.dataset.emoji, message.tabId);
                        }
                        closeDialog();
                    }
                });

                document.getElementById(FAVICON_PICKER_ID).addEventListener("click", () => {
                    emojiPicker.setVisibility(!emojiPicker.isVisible);
                    emojiPicker.focusTheSearchBar();
                });

                // Add Escape key listener to close the UI
                document.addEventListener("keydown", function(event) {
                    if (event.key === "Escape") {
                        closeDialog();
                    }
                });

                // Add click event listener to close the UI if clicked outside inputBox
                document.getElementById(OVERLAY_ID).addEventListener("click", function(event) {
                    closeDialog();
                });

                // Prevent clicks on the input box from propagating to the overlay
                inputBox.addEventListener("click", function(event) {
                    event.stopPropagation();
                });
            }
            openDialog();
        }
    }
);

function emojiPickCallback(emoji) {
    document.getElementById(EMOJI_PICKER_IMAGE_ID).style.display = 'none';
    document.getElementById(EMOJI_PICKER_ID).style.display = 'none';

    const emojiImg = document.getElementById(PICKED_EMOJI_ID);
    emojiImg.src = emojiToDataURL(emoji, 55);
    emojiImg.style.display = 'block';
    emojiImg.dataset.emoji = emoji;

    selectedEmoji = emoji;
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
    clearInputs();
}

function openDialog() {
    setUIVisibility(true);
}

// When content script is loaded, ask background script for tabId
chrome.runtime.sendMessage({command: "get_tabId" }, function(response) {
    updateFromStorage(response.tabId);
});

function updateFromStorage(tabId) {
    const titleKey = `${tabId}_title`;
    chrome.storage.sync.get([titleKey], function(result) {
        if (result[titleKey]) {
            setTabTitle(result[titleKey], tabId);
        }
    });

    const faviconKey = `${tabId}_favicon`;
    chrome.storage.sync.get([faviconKey], function(result) {
        if (result[faviconKey]) {
            setFavicon(result[faviconKey], tabId);
        }
    });
}
