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
        if (message === "open_rename_dialog") {

            if (!document.getElementById(prefixedIdInputBox)) {
                let htmlContent = `
                    <div id="${prefixedIdOverlay}" class="tab-renamer-extension-overlay"></div>
                    <div>
                        <input type="text" id="${prefixedIdInputBox}" class="tab-renamer-extension-input-box" placeholder="New tab name" autofocus/>
                    <div>
                `;
                document.body.insertAdjacentHTML('beforeend', htmlContent);

                // Add Enter key listener
                const inputBox = document.getElementById(prefixedIdInputBox);
                inputBox.addEventListener("keydown", function(event) {
                    if (event.key === "Enter") {
                        event.preventDefault();
                        document.title = inputBox.value;
                        setUIVisibility(false);
                    }
                });
            }
            setUIVisibility(true);
        }
    }
);