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
