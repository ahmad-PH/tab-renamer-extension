/** @module utils - This module should absolutely not import anything from other modules, as it is meant to 
 * only contain state-less, utility functions. I have even broken the dependency to the logger module to respect
 * this rule.
*/
import { getLogger } from "loglevel";
import * as utils from './utils';

const log = getLogger('utils');

const inProduction = typeof WEBPACK_MODE !== 'undefined' && WEBPACK_MODE === 'production';
if (inProduction) {
    log.setLevel('ERROR');
} else {
    log.setLevel('DEBUG');
}

/**
 * Asserts the type of a value.
 * @template T
 * @param {*} value The value to check.
 * @param {new (...args: any[]) => T} type The constructor of the type to check against.
 * @returns {T} The value, if it is of the correct type.
 * @throws {TypeError} If the value is not of the correct type.
 */
export function castType(value, type) {
    if (!(value instanceof type)) {
        throw new TypeError(`Expected value to be of type ${type.name}, but received ${typeof value}`);
    }
    if (value instanceof type) {
        return value;
    }
}

export function emojiToDataURL(emoji, sideLength = 64) {
    log.debug('emojiToDataURL called with emoji:', emoji);
    if (!emoji) {
        throw new Error(`emojiToDataURL called with ${emoji}`);
    }
    const canvas = document.createElement('canvas');
    canvas.width = sideLength;
    canvas.height = sideLength;

    // Get the canvas context and set the emoji
    const ctx = canvas.getContext('2d');
    ctx.font = `${sideLength}px serif`;
    const textX = platform === 'win' ? -12 : 0;
    ctx.fillText(emoji, textX, sideLength - 8);
    return canvas.toDataURL();
}


/**
 * 
 * @param {string} emoji
 * @param {string} joinCharacter
 * @returns code point, of code points of the emoji, joined by the joinCharacter
 */
export function getEmojiCodePoint(emoji, joinCharacter = '-') {
    // toString(16) converts codepoints to hexademical
    const codePoints = Array.from(emoji).map(symbol => symbol.codePointAt(0).toString(16));
    return codePoints.join(joinCharacter);
}


/**
 * Promisified version of chrome.storage.sync.set.
 * @param {Object} items - The items to be stored, directly passed to chrome.storage.sync.set.
 * @returns {Promise} - Returns a promise that resolves when the items are successfully stored.
 */
export function storageSet(items) {
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

/**
 * Promisified version of chrome.storage.sync.get.
 * @param {(null|string|number|(string|number)[])} keys - The key or keys to retrieve. Can be a single key (string or number) or an array of keys.
 * @returns {Promise} - Returns a promise that resolves with the requested items. If a single key is requested, the promise
 *                      resolves with the value of that key. If multiple keys are requested, the promise resolves with an 
 *                      object containing the keys and their corresponding values. When a key doesn't exist, `underfined`
 *                      is returned for that key.   
 */
export function storageGet(keys) {
    // Utility flexibility functionality:
    /** @type {null|string|string[]}*/
    let transformedKeys;
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

/**  Temporary solution, to filter based on the key being an integer. Needs to be updated to fetch from a 
 * designated "tabs" section.
 * @returns {Promise<Object>} - A promise that resolves to an object containing all tabs.
 */
export async function getAllTabs() {
    const fetchedObjects = await utils.storageGet(null);
    return Object.fromEntries(
        Object.entries(fetchedObjects).filter(([key]) => Number.isInteger(parseInt(key)))
    );
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let platform = 'mac';
if (typeof navigator !== 'undefined') {
    let platformString = '';
    
    // Try different methods to get platform string, in order of preference
    if (navigator.userAgentData?.platform) {
        platformString = navigator.userAgentData.platform.toLowerCase();
    } else if (navigator.platform) {
        platformString = navigator.platform.toLowerCase();
    } else {
        platformString = navigator.userAgent.toLowerCase();
    }
    
    platform = platformString.includes('mac') ? 'mac' :
        platformString.includes('win') ? 'win' : 
        platformString.includes('linux') ? 'linux' : 'other';
}

export { platform };