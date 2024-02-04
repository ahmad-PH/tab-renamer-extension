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
     * @param {FaviconDTO} favicon 
     * @param {string} originalTitle
     * @param {string} originalFaviconUrl
     */
    constructor(title, favicon, originalTitle = null, originalFaviconUrl = null) {
        this.title = title;
        this.favicon = favicon;
        this.originalTitle = originalTitle;
        this.originalFaviconUrl = originalFaviconUrl;
    }
}

export class FaviconDTO {
    /**
     * @param {string} type 
     * @param {string} content 
     */
    constructor(type, content) {
        this.type = type;
        this.content = content;
    }
}