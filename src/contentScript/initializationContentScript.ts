import { getLogger } from '../log';
import { TabSignature } from '../types';
import bgScriptApi from "../backgroundScriptApi";
import tab from "./tab";

const log = getLogger('InitializationContentScript');
const olog = getLogger('Title Observer');

void (async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called from the initialization content script.');
    const signature = await bgScriptApi.loadSignature(false);
    let title: string | null;
    if (signature) {
        log.debug('retrieved signature:', signature);
        title = signature.title;
    } else {
        log.debug('no signature found');
        title = null;
    }

    const originalTitle = document.title;
    let originalTitleIsStashed = false;
    const titleElements = Array.from(document.querySelectorAll('head > title')).map(el => el.textContent);

    log.debug(`document.title: ${originalTitle}, retrieved title: ${title}, document.readyState: ${document.readyState}, title elements: ${JSON.stringify(titleElements)}`);

    await tab.setSignature(title, null, false, false);
    if (originalTitle && originalTitle !== title) {
        log.debug(`Stashing original title: ${originalTitle}, because it is different from the retrieved title: ${title}`);
        await bgScriptApi.stashOriginalTitle(originalTitle);
        originalTitleIsStashed = true;
    } else {
        log.debug(`Not stashing original title: ${originalTitle} because it is the same as the retrieved title: ${title}`);
    }

    let originalTitleContent: string | null = null;

    const headMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeName === 'TITLE') {
                        olog.debug('TITLE element removed, text:', (node as HTMLTitleElement).textContent);
                        originalTitleContent = (node as HTMLTitleElement).textContent;
                    }
                });

                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'TITLE') {
                        olog.debug('TITLE element added, text:', (node as HTMLTitleElement).textContent);
                        
                        void bgScriptApi.stashOriginalTitle((node as HTMLTitleElement).textContent!);

                        if (originalTitleContent && (node as HTMLTitleElement).textContent !== originalTitleContent) {
                            olog.debug('Preventing title change, restoring original:', originalTitleContent);
                            (node as HTMLTitleElement).textContent = originalTitleContent;
                        }
                    }
                });
            }
        });
    });
    
    const headNode = document.querySelector('head');
    if (headNode) {
        headMutationObserver.observe(headNode, { childList: true });
    }

    const titleMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.nodeName === 'TITLE') {
                const newTitle = document.title;
                const oldTitle = mutation.oldValue;
                olog.debug('TITLE mutation detected, oldTitle:', oldTitle, 'newTitle:', newTitle);
            }
        });
    });

    const titleElement = document.querySelector('head > title');
    if (titleElement) {
        titleMutationObserver.observe(titleElement, { subtree: true, characterData: true, childList: true });
    }
})();

