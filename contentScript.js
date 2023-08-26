const EXTENSION_PREFIX = "tab_renamer_prefix"
const prefixedIdInputBox = `${EXTENSION_PREFIX}_inputBox`;
const prefixedIdOverlay = `${EXTENSION_PREFIX}_overlay`;

function setUIVisibility(visible) {
    const newDisplay = visible? "block": "none";
    document.getElementById(prefixedIdInputBox).style.display = newDisplay;
    document.getElementById(prefixedIdOverlay).style.display = newDisplay
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.command === "open_rename_dialog") {
            if (!document.getElementById(prefixedIdInputBox)) {
                let htmlContent = `
                    <div id="${prefixedIdOverlay}" class="tab-renamer-extension-overlay"></div>
                    <div>
                        <input type="text" id="${prefixedIdInputBox}" class="tab-renamer-extension-input-box" placeholder="New tab name" autofocus/>
                    <div>
                `;
                document.body.insertAdjacentHTML('beforeend', htmlContent);

                // Add Enter key listener to change the tab name
                const inputBox = document.getElementById(prefixedIdInputBox);
                inputBox.addEventListener("keydown", function(event) {
                    if (event.key === "Enter") {
                        event.preventDefault();

                        // Set and Record the new tab name:
                        const newTabName = inputBox.value;
                        document.title = newTabName;
                        chrome.storage.sync.set({[message.tabId]: newTabName}).then(() => {
                            console.log('Title set to ' + inputBox.value);
                        });

                        setUIVisibility(false);
                    }
                });

                // Add Escape key listener to close the UI
                document.addEventListener("keydown", function(event) {
                    if (event.key === "Escape") {
                        setUIVisibility(false);
                    }
                });

                // Add click event listener to close the UI if clicked outside inputBox
                const overlay = document.getElementById(prefixedIdOverlay);
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
chrome.runtime.sendMessage({ command: "get_tabId" }, function(response) {
    const tabId = response.tabId;
    updateTitleFromStorage(tabId);
});

function updateTitleFromStorage(tabId) {
    chrome.storage.sync.get([`${tabId}`], function(result) {
      if (result[`${tabId}`]) {
        document.title = result[`${tabId}`];
      }
    });
}