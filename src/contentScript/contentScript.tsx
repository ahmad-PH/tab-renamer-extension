import tab from "./tab";
import listenerManager from "./listenerManager";
import { COMMAND_CLOSE_WELCOME_TAB, COMMAND_DISCARD_TAB, COMMAND_OPEN_RENAME_DIALOG, COMMAND_SET_EMOJI_STYLE, ROOT_TAG_NAME, inProduction } from "../config";
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import { getLogger } from "../log";
import bgScriptApi from "../backgroundScriptApi";

const log = getLogger('contentScript');

let uiInsertedIntoDOM = false;
let root: Root | null = null;

let tabInitializationPromise = tab.initializeForMainContentScript();

if ((window as any).__tabRenamerContentScriptLoaded__) {
    log.warn('Content script already loaded, preventing duplicate execution');
    throw new Error('Content script already loaded');
}
(window as any).__tabRenamerContentScriptLoaded__ = true;

async function insertUIIntoDOM() {
    const existingRoot = document.querySelector(ROOT_TAG_NAME);
    if (existingRoot) {
        log.debug('Root element already exists in DOM, skipping insertion');
        return;
    }

    const startTotalTime = performance.now(); 

    const hostElement = document.createElement(ROOT_TAG_NAME);
    document.documentElement.appendChild(hostElement);
    const rootElement = hostElement.attachShadow({ mode: 'open' });
    root = createRoot(rootElement);

    const startImportTime = performance.now();
    const { default: App, TabContext } = await import('./components/App');
    const endImportTime = performance.now();

    await tabInitializationPromise;
    root.render(
        <TabContext.Provider value={tab}>
            <App/>
        </TabContext.Provider>
    );

    const endTotalTime = performance.now();

    log.debug(`Time taken to import App component: ${endImportTime - startImportTime} ms`);
    log.debug(`Total time taken for insertUIIntoDOM: ${endTotalTime - startTotalTime} ms`);
}
 
(function initializeUIListeners() {
    async function chromeListener(message: any, _sender: any, _sendResponse: any) {
        if (message.command === COMMAND_OPEN_RENAME_DIALOG) {
            await insertUIIntoDOM();
            chrome.runtime.onMessage.removeListener(chromeListener);
            document.removeEventListener(COMMAND_OPEN_RENAME_DIALOG, domListener);
        }
    }

    async function domListener(event: Event) {
        if (event.type === COMMAND_OPEN_RENAME_DIALOG) {
            await insertUIIntoDOM();
            chrome.runtime.onMessage.removeListener(chromeListener);
            document.removeEventListener(COMMAND_OPEN_RENAME_DIALOG, domListener);
        }
    }

    chrome.runtime.onMessage.addListener(chromeListener);
    document.addEventListener(COMMAND_OPEN_RENAME_DIALOG, domListener);
})();

if (!inProduction()) {
    chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
        if (message.command === '__FORWARD_LOG__') {
            const { level, name, message: logMessage, args } = message;
            const prefix = `#${name} [bg]`;
            
            const consoleMethod = (console as any)[level] || console.log;
            consoleMethod.call(console, prefix, logMessage, ...args);
        }
    });
}

const runtimePort = chrome.runtime.connect({ name: "content-script" });
runtimePort.onDisconnect.addListener(() => {
    listenerManager.removeAllListeners();

    tab.disconnectTabTitlePreserver();
    tab.disconnectFaviconPreserver();

    if (uiInsertedIntoDOM) {
        root?.unmount();
        uiInsertedIntoDOM = false;
    }

    const rootElement = document.querySelector(ROOT_TAG_NAME);
    if (rootElement) {
        rootElement.remove();
    }

    delete (window as any).__tabRenamerContentScriptLoaded__;

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
    document.addEventListener(COMMAND_SET_EMOJI_STYLE, 
        (event: Event) => {
            log.debug('Emoji style change listener in content script called.');
            const customEvent = event as MessageEvent;
            bgScriptApi.setEmojiStyle(customEvent.data.style);
        });
}

