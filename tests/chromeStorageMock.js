const chromeStorage = {};

const chromeStorageMock = {
    runtime: {},
    storage: {
        sync: {
            set: jest.fn((items, callback) => {
                Object.assign(chromeStorage, items);
                if (callback) {
                    callback();
                } else {
                    return new Promise((resolve) => resolve());
                }
            }),

            get: jest.fn((keys, callback) => {
                let result;
                if (keys === null) {
                    result = { ...chromeStorage };
                } else {
                    result = {};
                    const keysArray = Array.isArray(keys) ? keys : [keys];
                    keysArray.forEach(key => {
                        if (key in chromeStorage) {
                            result[key] = chromeStorage[key];
                        }
                    });
                }

                if (callback) {
                    callback(result);
                } else {
                    return new Promise((resolve) => resolve(result));
                }
            }),

            remove: jest.fn((keys, callback) => {
                const keysArray = Array.isArray(keys) ? keys : [keys];
                keysArray.forEach(key => {
                    if (key in chromeStorage) {
                        delete chromeStorage[key];
                    }
                });
                if (callback) {
                    callback();
                } else {
                    return new Promise((resolve) => resolve());
                }
            })
        }
    }
};

function setChromeStorageMockData(data) {
    Object.assign(chromeStorage, data);
}

module.exports = {
    chromeStorageMock, setChromeStorageMockData
};