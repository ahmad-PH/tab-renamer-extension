const { emojiToDataURL } = require("./utils");
import { FaviconDTO } from "./types";

export class Favicon {
    constructor() {
        if (new.target === Favicon) {
            throw new TypeError("Cannot construct Favicon instances directly");
        }
    }

    /**
     * @returns {FaviconDTO}
     * @abstract
     */   
    toDTO() {
        throw new Error("Method 'toDTO()' must be implemented.");
    }

    /**
     * @param {FaviconDTO} obj
     * @returns {Favicon}
     */
    static fromDTO(obj) {
        const subclasses = [EmojiFavicon, UrlFavicon];
        for (const subclass of subclasses) {
            if (subclass.type === obj.type) {
                return subclass.fromDTO(obj);
            }
        }
        throw new Error(`Unknown Favicon type: ${obj.type}`);
    }

    getUrl() {
        throw new Error("Method 'getUrl()' must be implemented.");
    }
}

export class EmojiFavicon extends Favicon {
    static type = 'emojiFavicon';

    constructor(emoji) {
        super();
        this.emoji = emoji;
        this._url = null;
    }

    toDTO() {
        return {'type': EmojiFavicon.type, 'content': this.emoji };
    }

    static fromDTO(obj) {
        return new EmojiFavicon(obj.content);
    }

    getUrl() {
        if (this._url === null) {
            this._url = emojiToDataURL(this.emoji);
        }
        return this._url;
    }
}

export class UrlFavicon extends Favicon {
    static type = 'urlFavicon';

    constructor(url) {
        super();
        this._url = url;
    }

    toDTO() {
        return {'type': UrlFavicon.type, 'content': this._url };
    }

    static fromDTO(obj) {
        return new UrlFavicon(obj.content);
    }

    getUrl() {
        return this._url;
    }
}