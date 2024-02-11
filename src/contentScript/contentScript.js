import tab from "./tab";
import listenerManager from "./listenerManager";
import { COMMAND_OPEN_RENAME_DIALOG, ROOT_ELEMENT_ID, ROOT_TAG_NAME } from "../config";
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { TabContext } from './components/App/App';
import React from 'react';
// eslint-disable-next-line no-unused-vars
import log from "../log";

// Global variables:
let uiInsertedIntoDOM = false;
let root = null;

let tabInitializationPromise = tab.initializeForMainContentScript();

async function insertUIIntoDOM() {
    if (uiInsertedIntoDOM === false) {
        // await tab.initializeForMainContentScript();
        await tabInitializationPromise;
        const rootElement = document.createElement(ROOT_TAG_NAME);
        document.body.appendChild(rootElement);
        root = createRoot(rootElement);
        root.render(
            <TabContext.Provider value={tab}>
                <App/>
            </TabContext.Provider>
        );
        uiInsertedIntoDOM = true;
    }
}
 
(function initializeUIListeners() {
    async function chromeListener(message, _sender, _sendResponse) {
        if (message.command === COMMAND_OPEN_RENAME_DIALOG) {
            await insertUIIntoDOM();
            chrome.runtime.onMessage.removeListener(chromeListener);
            document.removeEventListener(COMMAND_OPEN_RENAME_DIALOG, domListener);
        }
    }

    async function domListener(event) {
        if (event.type === COMMAND_OPEN_RENAME_DIALOG) {
            await insertUIIntoDOM();
            chrome.runtime.onMessage.removeListener(chromeListener);
            document.removeEventListener(COMMAND_OPEN_RENAME_DIALOG, domListener);
        }
    }

    chrome.runtime.onMessage.addListener(chromeListener);
    document.addEventListener(COMMAND_OPEN_RENAME_DIALOG, domListener);
})();

// Clean-up logic for when the extension unloads/reloads.
const runtimePort = chrome.runtime.connect({ name: "content-script" });
runtimePort.onDisconnect.addListener(() => {
    listenerManager.removeAllListeners();

    tab.disconnectTabTitlePreserver();
    tab.disconnectFaviconPreserver();

    if (uiInsertedIntoDOM) {
        root.unmount();
        uiInsertedIntoDOM = false;
    }

    const rootElement = document.getElementById(ROOT_ELEMENT_ID);
    if (rootElement) {
        rootElement.remove();
    }
});
