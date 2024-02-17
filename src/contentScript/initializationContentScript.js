import { getLogger } from '../log';
import { TabSignature } from '../types';
import bgScriptApi from "./backgroundScriptApi";
import tab from "./tab";

const log = getLogger('InitializationContentScript', 'debug');
const olog = getLogger('Observer', 'debug');

/** 
 * Update tab signature when the contentScript loads
 * This is mainly useful to:
 * - Eliminate the flash of the page's original title when the page change to a new title
 */ 
(async function updateTabSignatureFromStorage() {
    log.debug('updateTabSignatureFromStorage called from the initialization content script.');
    const signature = await bgScriptApi.loadSignature();
    let title, favicon;
    if (signature) {
        log.debug('retrieved signature:', signature);
        title = signature.title;
        favicon = signature.favicon;
    } else {
        log.debug('no signature found');
        title = null;
        favicon = null;
    }

    let originalTitle = document.title;
    let originalFaviconUrl = await bgScriptApi.getFaviconUrl();
    log.debug('document.title:', originalTitle, 'faviconUrl:', (originalFaviconUrl ? (originalFaviconUrl.substring(0, 30) + '...') : null));

    // const newSignature = new TabSignature(title, favicon, originalTitle, originalFaviconUrl);
    // log.debug('setting signature to:', newSignature);

    await tab.setSignature(title, favicon, false, false);
    tab.signature.originalTitle = originalTitle;

    // Title Observer:
    let titleMutationObserver = new MutationObserver((mutations) => {
        // olog.debug('titleMutationObserver callback called', mutations);
        mutations.forEach((mutation) => {
            if (mutation.target.nodeName === 'TITLE') {
                const newTitle = document.title;
                olog.debug('TITLE mutation detected, newTitle:', newTitle);
            }
        });
    });

    const titleElement = document.querySelector('head > title');
    // rplog.debug('title element:', titleElement)
    if (titleElement) {
        titleMutationObserver.observe(titleElement, { subtree: true, characterData: true, childList: true });
    }

    // Favicon Observer:
    let faviconMutationObserver = new MutationObserver((mutations) => {
        // olog.debug('faviconMutationObserver callback called', mutations);
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.target === document.head) {
                olog.debug('Children of <head> have changed');
                ['addedNodes', 'removedNodes'].forEach((nodeType) => {
                    mutation[nodeType].forEach((node) => {
                        if (node.nodeName === 'LINK') {
                            olog.debug('LINK mutation detected, of type: ', nodeType);
                            const newHref = node.href;
                            if (newHref.includes('data:')) {
                                olog.debug('LINK href:', newHref.substring(0, 30) + '...');
                            } else {
                                olog.debug('LINK href:', newHref);
                            }
                        }
                    });
                
                });
            }

            const target = mutation.target;
            if (target instanceof HTMLLinkElement) {
                if (target.nodeName === 'LINK' && target.rel.includes('icon')) {
                    olog.debug('LINK mutation detect, of type: direct mutation.', target.href.substring(0, 10) + '...');
                }
            }
        });
    });

    const headElement = document.querySelector('head');
    // olog.debug('head element:', headElement);
    if (headElement) {
        faviconMutationObserver.observe(headElement, { subtree: true, childList: true, attributes: true });
    }

})();