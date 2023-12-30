const chromeStorage = {};

const chromeStorageMock = {
    runtime: {},
    storage: {
        sync: {
            set: jest.fn((items, callback) => {
                Object.assign(chromeStorage, items);
                callback();
            }),
            get: jest.fn((keys, callback) => {
                if (keys === null) {
                    callback({ ...chromeStorage });
                } else {
                    const result = {};
                    const keysArray = Array.isArray(keys) ? keys : [keys];
                    keysArray.forEach(key => {
                        if (key in chromeStorage) {
                            result[key] = chromeStorage[key];
                        }
                    });
                    callback(result);
                }
            })
        }
    }
};

module.exports = {
    chromeStorageMock
};