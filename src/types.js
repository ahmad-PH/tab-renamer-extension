export class Tab {
    /**
     * @param {number} id
     * @param {string} url
     * @param {number} index - The index of the tab in the current window.
     * @param {boolean} isClosed
     * @param {string} closedAt - ISO string representing the time the tab was closed.
     * @param {TabSignature} signature
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
     * @param {string} originalTitle
     */
    constructor(title, favicon, originalTitle = null) {
        this.title = title;
        this.favicon = favicon;
        this.originalTitle = originalTitle;
    }
}