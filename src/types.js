/**
 * This file defines data-structures that are purely data and have no logic in them,
 * and that can be used by any component of the application, whether background, or 
 * contentScript.
 */

export class TabInfo {
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
     */
    constructor(title, favicon) {
        this.title = title;
        this.favicon = favicon;
    }

    /**
     * @returns {TabSignature}
     */
    static fromObject(obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, 'title')) {
            throw new Error('Invalid object: missing or invalid "title"' + JSON.stringify(obj));
        }
        if (!Object.prototype.hasOwnProperty.call(obj, 'favicon')) {
            throw new Error('Invalid object: missing or invalid "favicon"' + JSON.stringify(obj));
        }

        return new TabSignature(obj.title, obj.favicon);
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