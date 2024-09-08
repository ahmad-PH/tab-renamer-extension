const { emojiToDataURL, getEmojiCodePoint } = require("./utils");
import log from "./log";
import { FaviconDTO } from "./types";

export class Favicon {
    constructor() {
        if (new.target === Favicon) {
            throw new TypeError("Cannot construct Favicon instances directly");
        }
    }

    /**
     * @returns {string}
     */
    getId() {
        throw new Error("Method 'getId()' must be implemented.");
    }

    /**
     * @returns {string} returns the url that can be used as the src attribute of an img tag.
     * If this is a system emoji, the url will be a data URL.
     */
    getUrl() {
        throw new Error("Method 'getUrl()' must be implemented.");
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
        log.debug('Favicon.fromDTO called with obj:', obj);
        const subclasses = [SystemEmojiFavicon, TwemojiFavicon, UrlFavicon];
        for (const subclass of subclasses) {
            if (subclass.type === obj.type) {
                log.debug('Found matching subclass:', subclass);
                return subclass.fromDTO(obj);
            }
        }
        throw new Error(`Unknown Favicon type: ${obj.type}`);
    }

}

export class SystemEmojiFavicon extends Favicon {
    static type = 'systemEmojiFavicon';

    constructor(emoji) {
        super();
        this.emoji = emoji;
        this._url = null;
    }

    getId() {
        return this.emoji;
    }

    toDTO() {
        return {'type': SystemEmojiFavicon.type, 'content': this.emoji };
    }

    static fromDTO(obj) {
        return new SystemEmojiFavicon(obj.content);
    }

    getUrl() {
        if (this._url === null) {
            this._url = emojiToDataURL(this.emoji);
        }
        return this._url;
    }
}

export class TwemojiFavicon extends Favicon {
    static type = 'twemojiFavicon';

    constructor(emoji) {
        super();
        this.emoji = emoji;
        this._url = null;
    }

    getId() {
        return this.emoji;
    }

    toDTO() {
        return {'type': TwemojiFavicon.type, 'content': this.emoji };
    }

    static fromDTO(obj) {
        return new TwemojiFavicon(obj.content);
    }

    getUrl() {
        if (this._url === null) {
            const codepoint = getEmojiCodePoint(this.emoji)
            this._url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint}.png`;
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

    /**
     * getId() is not well-defined for URL favicons yet.
     * In the future I plan on using the ID of the image on the backend to represent this. Something 
     * like if the URL is a tabrenamer.com/{id}.png, then the ID would be {id}.');
     */
    // @ts-ignore
    getId() {
        return '';
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