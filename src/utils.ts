import { getLogger } from "./log";
import * as utils from './utils';
import { platform } from "./config";

const log = getLogger('utils', 'debug');

export function castType<T>(value: any, type: new (...args: any[]) => T): T {
    if (!(value instanceof type)) {
        throw new TypeError(`Expected value to be of type ${type.name}, but received ${typeof value}`);
    }
    if (value instanceof type) {
        return value;
    }
    throw new TypeError(`Expected value to be of type ${type.name}, but received ${typeof value}`);
}

export function emojiToDataURL(emoji: string, sideLength: number = 64): string {
    log.debug('emojiToDataURL called with emoji:', emoji);
    if (!emoji) {
        throw new Error(`emojiToDataURL called with ${emoji}`);
    }
    const canvas = document.createElement('canvas');
    canvas.width = sideLength;
    canvas.height = sideLength;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }
    ctx.font = `${sideLength}px serif`;
    const textX = platform === 'win' ? -12 : 0;
    ctx.fillText(emoji, textX, sideLength - 8);
    return canvas.toDataURL();
}

export function getEmojiCodePoint(emoji: string, joinCharacter: string = '-'): string {
    const codePoints = Array.from(emoji).map(symbol => symbol.codePointAt(0)!.toString(16));
    return codePoints.join(joinCharacter);
}

export function storageSet(items: Record<string, any>): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(items, function() {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve();
            }
        });
    });
}

export function storageGet(keys: null | string | number | (string | number)[]): Promise<any> {
    let transformedKeys: null | string | string[];
    if (keys === null) {
        transformedKeys = null;
    } else {
        if (Array.isArray(keys)) {
            transformedKeys = keys.map(key => key.toString());
        } else {
            transformedKeys = keys.toString();
        }
    }

    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(transformedKeys, function(items) {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                if (transformedKeys !== null && !Array.isArray(transformedKeys)) {
                    resolve(items[transformedKeys]);
                } else {
                    resolve(items);
                }
            }
        });
    });
}

export async function getAllTabs(): Promise<Record<string, any>> {
    const fetchedObjects = await utils.storageGet(null);
    return Object.fromEntries(
        Object.entries(fetchedObjects).filter(([key]) => Number.isInteger(parseInt(key)))
    );
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
