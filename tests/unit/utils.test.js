import { storageGet } from '../../src/utils';

// Mock chrome.storage.sync.get
global.chrome = {
    runtime: {},
    storage: {
        sync: {
            get: jest.fn((keys, callback) => {
                callback({});
            })
        }
    }
};

describe('storageGet', () => {
    beforeEach(() => {
        chrome.storage.sync.get.mockClear();
    });

    it('should pass null to chrome.storage.sync.get when called with null', async () => {
        await storageGet(null);
        expect(chrome.storage.sync.get).toHaveBeenCalledWith(null, expect.any(Function));
    });

    it('should pass the stringified number to chrome.storage.sync.get when called with a number', async () => {
        await storageGet(1);
        expect(chrome.storage.sync.get).toHaveBeenCalledWith('1', expect.any(Function));
    });

    it('should pass the same string to chrome.storage.sync.get when called with a string', async () => {
        await storageGet('key');
        expect(chrome.storage.sync.get).toHaveBeenCalledWith('key', expect.any(Function));
    });

    it('should pass stringified numbers to chrome.storage.sync.get when called with an array of numbers', async () => {
        await storageGet([1, 2]);
        expect(chrome.storage.sync.get).toHaveBeenCalledWith(['1', '2'], expect.any(Function));
    });

    it('should pass the same array of strings to chrome.storage.sync.get when called with an array of strings', async () => {
        await storageGet(['key1', 'key2']);
        expect(chrome.storage.sync.get).toHaveBeenCalledWith(['key1', 'key2'], expect.any(Function));
    });
});