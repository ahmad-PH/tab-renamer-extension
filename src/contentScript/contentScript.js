import { preserveFavicon, preserveTabTitle, disconnectTabTitlePreserver, disconnectFaviconPreserver } from "./preservers";
import listenerManager from "./listenerManager";
import { EVENT_OPEN_RENAME_DIALOG, ROOT_ELEMENT_ID, ROOT_TAG_NAME } from "../config";
import { createRoot } from 'react-dom/client';
import { App } from './components/App';
import { emojiToDataURL } from '../utils';
import bgScriptApi from "./backgroundScriptApi";
import React from 'react';
import log from "../log";

// Global variables:
let uiInsertedIntoDOM = false;
let root = null;

export async function setTabTitle(newTabTitle) {
    log.debug('setTabTitle called with newTabTitle:', newTabTitle);
    preserveTabTitle(newTabTitle);
    document.title = newTabTitle;
    await bgScriptApi.saveSignature(newTabTitle, null);
}

export async function setTabFavicon(favicon) {
    // Check if a favicon link element already exists
    const faviconLinks = document.querySelectorAll("link[rel*='icon']");
    faviconLinks.forEach(link => {
        link.parentNode.removeChild(link);
    });

    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    // The only supported type of favicon is emojis, so the favicon is assumed to be one.
    const emojiDataURL = emojiToDataURL(favicon, 64);
    link.href = emojiDataURL;
    document.getElementsByTagName('head')[0].appendChild(link);

    await bgScriptApi.saveSignature(null, favicon);
    preserveFavicon(emojiDataURL);
}

/** Update tab signature when the contentScript loads:
 *  This is an immediately invoked function expression (IIFE)
 */ 
(async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called');
    const signature = await bgScriptApi.loadSignature();
    if (signature) {
        log.debug('retrieved signature:', signature);
        if (signature.title) {
            setTabTitle(signature.title);
        }
        if (signature.favicon) {
            setTabFavicon(signature.favicon);
        }
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
