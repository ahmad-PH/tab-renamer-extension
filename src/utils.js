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
 * @param {(string|number|(string|number)[])} keys - The key or keys to retrieve. Can be a single key (string or number) or an array of keys.
 * @returns {Promise} - Returns a promise that resolves with the requested items. If a single key is requested, the promise resolves with the value of that key. If multiple keys are requested, the promise resolves with an object containing the keys and their corresponding values.
 */
export function storageGet(keys) {
    // Utility flexibility functionality:
    if (keys !== null) {
        // Make it a list if it is not already
        if (!Array.isArray(keys))
            keys = [keys];
        // Stringify the list
        keys = keys.map(key => key.toString());
    }

    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(keys, function(items) {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                if (keys !== null && keys.length == 1) {
                    resolve(items[keys[0]]);
                } else {
                    resolve(items);
                }
            }
        });
    });
}
