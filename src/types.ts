/**
 * All the information about a tab that the extension cares about.
 * This object gets directly stored/retrieved from the storage.
 */
export class TabInfo {
    id: number;
    url: string;
    index: number;
    isClosed: boolean;
    closedAt: string | null;
    signature: TabSignature;

    constructor(id: number, url: string, index: number, isClosed: boolean, closedAt: string | null, signature: TabSignature) {
        this.id = id;
        this.url = url;
        this.index = index;
        this.isClosed = isClosed;
        this.closedAt = closedAt;
        this.signature = signature;
    }

    toString(): string {
        return `TabInfo(id: ${this.id}, url: ${this.url}, index: ${this.index}, isClosed: ${this.isClosed}, closedAt: ${this.closedAt}, signature: ${this.signature.toString()})`;
    }
}

export class TabSignature {
    title: string | null;
    favicon: FaviconDTO | null;

    constructor(title: string | null, favicon: FaviconDTO | null) {
        this.title = title;
        this.favicon = favicon;
    }

    static fromObject(obj: any): TabSignature {
        if (!Object.prototype.hasOwnProperty.call(obj, 'title')) {
            throw new Error('Invalid object: missing or invalid "title"' + JSON.stringify(obj));
        }
        if (!Object.prototype.hasOwnProperty.call(obj, 'favicon')) {
            throw new Error('Invalid object: missing or invalid "favicon"' + JSON.stringify(obj));
        }

        return new TabSignature(obj.title, obj.favicon);
    }

    toString(): string {
        return `TabSignature(title: ${this.title}, favicon: ${this.favicon})`;
    }
}

export class FaviconDTO {
    type: string;
    content: string;

    constructor(type: string, content: string) {
        this.type = type;
        this.content = content;
    }
}

export class Emoji {
    character: string;
    shortcode: string;
    keywords: string[];

    constructor(character: string, shortcode: string, keywords: string[]) {
        this.character = character;
        this.shortcode = shortcode;
        this.keywords = keywords;
    }
}

