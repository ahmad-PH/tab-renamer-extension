
let tabMutationObserver = null;
let faviconMutationObserver = null;

/* This function seems to be only required when:
 * 1- Clicking on a link that changes the tab
 * 2- On websites like Facebook that keep enforing their own title
 */
export function preserveTabTitle(desiredTitle) {
    // Disconnect the previous observer if it exists, to avoid an infinite loop.    
    disconnectTabTitlePreserver()
    tabMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.nodeName === 'TITLE') {
                const newTitle = document.title;
                if (newTitle !== desiredTitle) {
                    document.title = desiredTitle;
                }
            }
        });
    });
  
    const titleElement = document.querySelector('head > title');
    if (titleElement) {
        tabMutationObserver.observe(titleElement, { subtree: true, characterData: true, childList: true });
    }
};

export function disconnectTabTitlePreserver() {
    if (tabMutationObserver) {
        tabMutationObserver.disconnect();
    }
}

/**
 * @param {string} emojiDataURL
 */
export function preserveFavicon(emojiDataURL) {
    // Disconnect the previous observer if it exists, to avoid infinite loop.
    disconnectFaviconPreserver();

    faviconMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const target = mutation.target;
            if (target instanceof HTMLLinkElement) {
                if (target.nodeName === 'LINK' && target.rel.includes('icon')) {
                    if (target.href !== emojiDataURL) {
                        target.href = emojiDataURL;
                    }
                }
            }

        });
    });

    const headElement = document.querySelector('head');
    if (headElement) {
        faviconMutationObserver.observe(headElement, { subtree: true, childList: true, attributes: true });
    }
}

export function disconnectFaviconPreserver() {
    if (faviconMutationObserver) {
        faviconMutationObserver.disconnect();
    }
}