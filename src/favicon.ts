import { emojiToDataURL, getEmojiCodePoint } from "./utils";
import log from "./log";
import { FaviconDTO } from "./types";

export abstract class Favicon {
    constructor() {
        if (new.target === Favicon) {
            throw new TypeError("Cannot construct Favicon instances directly");
        }
    }

    abstract getId(): string;
    abstract getUrl(): string;
    abstract toDTO(): FaviconDTO;

    static fromDTO(obj: FaviconDTO): Favicon {
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
    emoji: string;
    private _url: string | null = null;

    constructor(emoji: string) {
        super();
        this.emoji = emoji;
    }

    getId(): string {
        return this.emoji;
    }

    toDTO(): FaviconDTO {
        return {'type': SystemEmojiFavicon.type, 'content': this.emoji };
    }

    static fromDTO(obj: FaviconDTO): SystemEmojiFavicon {
        return new SystemEmojiFavicon(obj.content);
    }

    getUrl(): string {
        if (this._url === null) {
            this._url = emojiToDataURL(this.emoji);
        }
        return this._url;
    }
}

export class TwemojiFavicon extends Favicon {
    static type = 'twemojiFavicon';
    emoji: string;
    private _url: string | null = null;

    constructor(emoji: string) {
        super();
        this.emoji = emoji;
    }

    getId(): string {
        return this.emoji;
    }

    toDTO(): FaviconDTO {
        return {'type': TwemojiFavicon.type, 'content': this.emoji };
    }

    static fromDTO(obj: FaviconDTO): TwemojiFavicon {
        return new TwemojiFavicon(obj.content);
    }

    getUrl(): string {
        if (this._url === null) {
            const codepoint = getEmojiCodePoint(this.emoji)
            this._url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint}.png`;
        }
        return this._url;
    }
}

export class UrlFavicon extends Favicon {
    static type = 'urlFavicon';
    private _url: string;

    constructor(url: string) {
        super();
        this._url = url;
    }

    getId(): string {
        return '';
    }

    toDTO(): FaviconDTO {
        return {'type': UrlFavicon.type, 'content': this._url };
    }

    static fromDTO(obj: FaviconDTO): UrlFavicon {
        return new UrlFavicon(obj.content);
    }

    getUrl(): string {
        return this._url;
    }
}

