import { getLogger } from '../log';
import { TabSignature } from '../types';
import bgScriptApi from "../backgroundScriptApi";
import tab from "./tab";

const log = getLogger('InitializationContentScript', 'debug');
const olog = getLogger('Title Observer', 'debug');

/** 
 * Update tab signature when the contentScript loads
 * This is mainly useful to:
 * - Eliminate the flash of the page's original title when the page change to a new title
 */ 
(async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called from the initialization content script.');
    const signature = await bgScriptApi.loadSignature(false);
    let title;
    if (signature) {
        log.debug('retrieved signature:', signature);
        title = signature.title;
    } else {
        log.debug('no signature found');
        title = null;
    }

    // Log Stuff:
    let originalTitle = document.title;
    let originalTitleIsStashed = false;
    let titleElements = Array.from(document.querySelectorAll('head > title')).map(el => el.textContent);

    log.debug(`document.title: ${originalTitle}, retrieved title: ${title}, document.readyState: ${document.readyState}, title elements: ${titleElements}`);
    // log.debug('document head:', document.head.outerHTML);

    await tab.setSignature(title, null, false, false);
    if (originalTitle && originalTitle !== title) {
        log.debug(`Stashing original title: ${originalTitle}, because it is different from the retrieved title: ${title}`);
        await bgScriptApi.stashOriginalTitle(originalTitle);
        originalTitleIsStashed = true;
    } else {
        log.debug(`Not stashing original title: ${originalTitle} because it is the same as the retrieved title: ${title}`);
    }


    // =================================== Title Observer: ===================================
    let originalTitleContent = null;

    let headMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeName === 'TITLE') {
                        olog.debug('TITLE element removed, text:', node.textContent);
                        originalTitleContent = node.textContent;
                    }
                });

                // Check added nodes and prevent unwanted changes
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'TITLE') {
                        olog.debug('TITLE element added, text:', node.textContent);
                        
                        // This is important for websites like GitHub that don't load with a document.title
                        // directly for some reason, and later add a <title> node to the website content.
                        // Maybe because its dynamically added later. We want to record these instances
                        // as original title(s).
                        bgScriptApi.stashOriginalTitle(node.textContent);

                        // If we have an original title and the new content is different
                        if (originalTitleContent && node.textContent !== originalTitleContent) {
                            olog.debug('Preventing title change, restoring original:', originalTitleContent);
                            node.textContent = originalTitleContent;
                        }
                    
                    }
                });
            
            }
        });
    });
    
    // Start observing the head element for child list mutations
    let headNode = document.querySelector('head');
    if (headNode) {
        headMutationObserver.observe(headNode, { childList: true });
    }

    let titleMutationObserver = new MutationObserver((mutations) => {
        // olog.debug('titleMutationObserver callback called', mutations);
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


