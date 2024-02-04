import { disconnectTabTitlePreserver, disconnectFaviconPreserver } from "./preservers";
import listenerManager from "./listenerManager";
import { EVENT_OPEN_RENAME_DIALOG, ROOT_ELEMENT_ID, ROOT_TAG_NAME } from "../config";
import { createRoot } from 'react-dom/client';
import App from './components/App';
import React from 'react';
// eslint-disable-next-line no-unused-vars
import log from "../log";
import { setDocumentSignature } from "./setters";
import bgScriptApi from "./backgroundScriptApi";

// Global variables:
let uiInsertedIntoDOM = false;
let root = null;


(async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called');
    const signature = await bgScriptApi.loadSignature();
    if (signature) {
        log.debug('retrieved signature:', signature);
        await setDocumentSignature(signature, true, false);
    } else {
        log.debug('no signature found');
    }
})();

function insertUIIntoDOM() {
    if (uiInsertedIntoDOM === false) {
        const rootElement = document.createElement(ROOT_TAG_NAME);
        rootElement.id = ROOT_ELEMENT_ID;
        document.body.appendChild(rootElement);
        root = createRoot(rootElement);
        root.render(<App />)
        uiInsertedIntoDOM = true;
    }
}

(function initializeUIListeners() {
    function chromeListener(message, _sender, _sendResponse) {
        if (message.command === EVENT_OPEN_RENAME_DIALOG) {
            insertUIIntoDOM();
            chrome.runtime.onMessage.removeListener(chromeListener);
            document.removeEventListener(EVENT_OPEN_RENAME_DIALOG, domListener);
        }
    }

    function domListener(event) {
        if (event.type === EVENT_OPEN_RENAME_DIALOG) {
            insertUIIntoDOM();
            chrome.runtime.onMessage.removeListener(chromeListener);
            document.removeEventListener(EVENT_OPEN_RENAME_DIALOG, domListener);
        }
    }

    chrome.runtime.onMessage.addListener(chromeListener);
    document.addEventListener(EVENT_OPEN_RENAME_DIALOG, domListener);
})();

// Clean-up logic for when the extension unloads/reloads.
const runtimePort = chrome.runtime.connect({ name: "content-script" });
runtimePort.onDisconnect.addListener(() => {
    listenerManager.removeAllListeners();

    disconnectTabTitlePreserver();
    disconnectFaviconPreserver();

    if (uiInsertedIntoDOM) {
        root.unmount();
        uiInsertedIntoDOM = false;
    }

    const rootElement = document.getElementById(ROOT_ELEMENT_ID);
    if (rootElement) {
        rootElement.remove();
    }
});