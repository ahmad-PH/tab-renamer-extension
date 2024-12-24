import tab from "./tab";
import listenerManager from "./listenerManager";
import { COMMAND_CLOSE_WELCOME_TAB, COMMAND_DISCARD_TAB, COMMAND_OPEN_RENAME_DIALOG, COMMAND_EMOJI_STYLE_CHANGE, ROOT_TAG_NAME, inProduction } from "../config.js";
import { createRoot } from 'react-dom/client';
import React from 'react';
// eslint-disable-next-line no-unused-vars
import { getLogger } from "../log";

const log = getLogger('contentScript', 'debug');

// Global variables:
let uiInsertedIntoDOM = false;
let root = null;

let tabInitializationPromise = tab.initializeForMainContentScript();

async function insertUIIntoDOM() {
    if (uiInsertedIntoDOM === false) {
        const hostElement = document.createElement(ROOT_TAG_NAME);
        document.body.appendChild(hostElement);
        const rootElement = hostElement.attachShadow({ mode: 'open' });
        root = createRoot(rootElement);

        const { default: App, TabContext } = await import('./components/App');

        await tabInitializationPromise;
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

    // const rootElement = document.getElementById(ROOT_ELEMENT_ID);
    const rootElement = document.querySelector(ROOT_TAG_NAME);
    if (rootElement) {
        rootElement.remove();
    }

    if (!inProduction()) {
        document.removeEventListener(COMMAND_OPEN_RENAME_DIALOG, discardTabListener);
    }
});


const discardTabListener = () => {
    log.debug('discard tab listener in content script called.');
    setTimeout(() => {
        chrome.runtime.sendMessage({command: COMMAND_DISCARD_TAB});
    }, 500);
}

if (!inProduction()) {
    log.debug('Adding discard tab listener in content script.');
    
    document.addEventListener(COMMAND_DISCARD_TAB, discardTabListener);
    document.addEventListener(COMMAND_CLOSE_WELCOME_TAB, () => {
        log.debug('close welcome tab listener in content script called.');
        chrome.runtime.sendMessage({command: COMMAND_CLOSE_WELCOME_TAB});
    });

    log.debug('Adding Emoji style listener in content script.');
    document.addEventListener(COMMAND_EMOJI_STYLE_CHANGE, 
        /** @param {MessageEvent} event */
        (event) => {
            log.debug('Emoji style change listener in content script called.');
            chrome.runtime.sendMessage({
                command: COMMAND_EMOJI_STYLE_CHANGE,
                style: event.data.style
        });
    });
}
