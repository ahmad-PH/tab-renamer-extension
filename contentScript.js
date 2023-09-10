import { populateEmojiPicker } from "./emojiPicker";

// const EXTENSION_PREFIX = "tab_renamer_prefix"
const rootElementId = 'tab-renamer-extension-root';
const inputBoxId = 'tab-renamer-extension-input-box';
const overlayId = 'tab-renamer-extension-overlay';
let tabMutationObserver = null;

function setTabTitle(newTabTitle, tabId) {
    document.title = newTabTitle;
    chrome.storage.sync.set({[tabId]: newTabTitle}).then(() => {
        console.log('Title set to ' + newTabTitle);
    });
    preserveTabTitle(newTabTitle);
}

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

function setUIVisibility(visible) {
    const newDisplay = visible? "block": "none";
    document.getElementById(rootElementId).style.display = newDisplay;
    if (visible) {
        document.getElementById(inputBoxId).focus();
    }
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.command === "open_rename_dialog") {
            if (!document.getElementById(inputBoxId)) {
                let htmlContent = `
                    <div id="${rootElementId}">
                        <div id="${overlayId}"></div>
                        <div id="tab-renamer-extension-input-container">
                            <div id="tab-renamer-extension-favicon-picker">
                                <img id="emoji-picker-image"/>
                                <div id="emoji-picker"> </div>
                            </div>
                            <input type="text" id="${inputBoxId}" placeholder="New tab name" autocomplete="off" autofocus/>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', htmlContent);
                document.getElementById("emoji-picker-image").src = chrome.runtime.getURL("assets/emoji_picker_icon.png");
                populateEmojiPicker("emoji-picker");

                // Add Enter key listener to change the tab name
                const inputBox = document.getElementById(inputBoxId);
                inputBox.addEventListener("keydown", function(event) {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        setTabTitle(inputBox.value, message.tabId);
                        // setEmojiFavicon(inputBox.value);
                        setUIVisibility(false);
                        inputBox.value = "";
                    }
                });

                // Add Escape key listener to close the UI
                document.addEventListener("keydown", function(event) {
                    if (event.key === "Escape") {
                        setUIVisibility(false);
                    }
                });

                // Add click event listener to close the UI if clicked outside inputBox
                const overlay = document.getElementById(overlayId);
                overlay.addEventListener("click", function(event) {
                    setUIVisibility(false);
                });

                // Prevent clicks on the input box from propagating to the overlay
                inputBox.addEventListener("click", function(event) {
                    event.stopPropagation();
                });
            }
            setUIVisibility(true);
        }
    }
);

// When content script is loaded, ask background script for tabId
chrome.runtime.sendMessage({command: "get_tabId" }, function(response) {
    updateTitleFromStorage(response.tabId);
});

function updateTitleFromStorage(tabId) {
    chrome.storage.sync.get([`${tabId}`], function(result) {
        if (result[`${tabId}`]) {
            setTabTitle(result[`${tabId}`], tabId);
        }
    });
}

function setEmojiFavicon(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;

    // Get the canvas context and set the emoji
    const ctx = canvas.getContext('2d');
    ctx.font = '64px serif';
    ctx.fillText(emoji, 0, 56);
    const faviconURL = canvas.toDataURL();
    console.log('The data URL:', faviconURL);

    // Check if a favicon link element already exists
    let link = document.querySelector("link[rel*='icon']");

    // Create the link element if it doesn't exist
    if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }

    // Set the favicon
    link.href = faviconURL;
}

