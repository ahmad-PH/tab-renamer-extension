import tab from "./tab";
import listenerManager from "./listenerManager";
import { COMMAND_DISCARD_TAB, COMMAND_FORCE_TITLE, COMMAND_OPEN_RENAME_DIALOG, ROOT_TAG_NAME, TEST_COMMAND, inProduction } from "../config";
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import { getLogger } from "../log";

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.command === COMMAND_FORCE_TITLE) {
        const desiredTitle = message.title as string;
        log.debug('Force title command received with title:', desiredTitle);
        tab.forceTitle(desiredTitle);
        sendResponse({ success: true });
    }
});

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

    if (!inProduction() && testCommandListener) {
        document.removeEventListener(TEST_COMMAND, testCommandListener);
    }
});

interface TestCommandDetail {
    command: string;
    [key: string]: unknown;
}

let testCommandListener: ((event: Event) => void) | null = null;

if (!inProduction()) {
    log.debug('Adding test command listener in content script.');
    
    testCommandListener = (event: Event) => {
        const { command, ...data } = (event as CustomEvent<TestCommandDetail>).detail;
        log.debug('Test command received:', command, data);
        
        if (command === COMMAND_DISCARD_TAB) {
            setTimeout(() => {
                void chrome.runtime.sendMessage({ command, ...data });
            }, 500);
        } else {
            void chrome.runtime.sendMessage({ command, ...data });
        }
    };
    document.addEventListener(TEST_COMMAND, testCommandListener);
}

