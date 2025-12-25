import { getLogger } from '../log';
import bgScriptApi from "../backgroundScriptApi";
import tab from "./tab";

const log = getLogger('InitializationContentScript');

void (async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called from the initialization content script.');
    const signature = await bgScriptApi.loadSignature(false);
    const title = signature?.title ?? null;
    
    if (signature) {
        log.debug('retrieved signature:', signature);
    } else {
        log.debug('no signature found');
    }

    const originalTitle = document.title;
    log.debug(`document.title: ${originalTitle}, retrieved title: ${title}, document.readyState: ${document.readyState}`);

    await tab.setSignature(title, null, false, false);
    
    if (originalTitle && originalTitle !== title) {
        log.debug(`Stashing original title: ${originalTitle}, because it is different from the retrieved title: ${title}`);
        await bgScriptApi.stashOriginalTitle(originalTitle);
    } else {
        log.debug(`Not stashing original title: ${originalTitle} because it is the same as the retrieved title: ${title}`);
    }

    setupHeadMutationObserver();
})();

function setupHeadMutationObserver() {
    let lastRemovedTitleContent: string | null = null;

    const headMutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type !== 'childList') continue;

            for (const node of mutation.removedNodes) {
                if (node.nodeName === 'TITLE') {
                    log.debug('TITLE element removed, text:', (node as HTMLTitleElement).textContent);
                    lastRemovedTitleContent = (node as HTMLTitleElement).textContent;
                }
            }

            for (const node of mutation.addedNodes) {
                if (node.nodeName === 'TITLE') {
                    const titleElement = node as HTMLTitleElement;
                    const newTitleContent = titleElement.textContent;
                    log.debug('TITLE element added, text:', newTitleContent);
                    
                    if (newTitleContent) {
                        void bgScriptApi.stashOriginalTitle(newTitleContent);
                    }

                    if (lastRemovedTitleContent && newTitleContent !== lastRemovedTitleContent) {
                        log.debug('Preventing title change, restoring original:', lastRemovedTitleContent);
                        titleElement.textContent = lastRemovedTitleContent;
                    }
                }
            }
        }
    });
    
    const headNode = document.querySelector('head');
    if (headNode) {
        headMutationObserver.observe(headNode, { childList: true });
    }
}

