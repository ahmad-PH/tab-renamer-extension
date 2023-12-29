export class Tab {
    /**
     * @param {number} id - The id of the tab.
     * @param {string} url - The URL of the tab.
     * @param {number} index - The index of the tab in the current window.
     * @param {boolean} isClosed - Whether the tab is closed.
     * @param {string} closedAt - ISO string representing the time the tab was closed.
     * @param {TabSignature} signature - The signature of the tab.
     */
    constructor(id, url, index, isClosed, closedAt, signature) {
        this.id = id;
        this.url = url;
        this.index = index;
        this.isClosed = isClosed;
        this.closedAt = closedAt;
        this.signature = signature;
    }
}

/**
 * The information visible on top of a tab: The title, and the favicon
 */
export class TabSignature {
    /**
     * @param {string} title 
     * @param {string} favicon 
     */
    constructor(title, favicon) {
        this.title = title;
        this.favicon = favicon;
    }
}
