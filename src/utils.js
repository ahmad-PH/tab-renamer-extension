export function emojiToDataURL(emoji, sideLength) {
    const canvas = document.createElement('canvas');
    canvas.width = sideLength;
    canvas.height = sideLength;

    // Get the canvas context and set the emoji
    const ctx = canvas.getContext('2d');
    ctx.font = `${sideLength}px serif`;
    ctx.fillText(emoji, 0, sideLength - 8);
    return canvas.toDataURL();
}


/**
 * Promisified version of chrome.storage.sync.set.
 *
 * @param {Object} items - An object which gives each key/value pair to update storage with.
 * @returns {Promise<void>} - A promise that resolves when the storage has been set.
 */
export function storageSet(items) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(items, function() {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve();
            }
        });
    });
}

/**
 * Promisified version of chrome.storage.sync.get.
 *
 * @param {string|string[]} keys - A single key to get, list of keys to get, or a dictionary specifying default values.
 * @returns {Promise<Object>} - A promise that resolves with the storage items, or an empty object if the keys do not exist.
 */
export function storageGet(keys) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, function(items) {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError));
            } else {
                resolve(items);
            }
        });
    });
}