console.log('content script run');
const EXTENSION_PREFIX = "tab_renamer_prefix"
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message === "open_rename_dialog") {
            const prefixedIdInputBox = `${EXTENSION_PREFIX}_inputBox`;
            const prefixedIdOverlay = `${EXTENSION_PREFIX}_overlay`;
            if (!document.getElementById(prefixedIdInputBox)) {
                let htmlContent = `
                    <div id="${prefixedIdOverlay}" class="tab-renamer-extension-overlay"></div>
                    <div>
                        <input type="text" id="${prefixedIdInputBox}" class="tab-renamer-extension-input-box" placeholder="New tab name" autofocus/>
                    <div>
                `;
                document.body.insertAdjacentHTML('beforeend', htmlContent);
            }
            document.getElementById(prefixedIdInputBox).style.display = "block";
            document.getElementById(prefixedIdOverlay).style.display = "block";
        }
    }
);


// // Insert my css:
// const link = document.createElement('link');
// link.rel = 'stylesheet';
// link.href = chrome.runtime.getURL('rename-dialog/rename.css');
// document.head.appendChild(link);
