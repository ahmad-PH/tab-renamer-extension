/* global chrome */
import { storageGet } from 'src/utils';
import * as utils from 'src/utils';
import { chromeStorageMock } from './chromeStorageMock';
import { getAllTabs } from '../../src/utils';


describe('storageGet', () => {
    beforeEach(() => {
        global.chrome = chromeStorageMock;
        chrome.storage.sync.get.mockClear();
    });

    afterEach(() => {
        delete global.chrome;
    });

    it('should pass null to chrome.storage.sync.get when called with null', async () => {
        await getAllTabs();
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


describe('getAllTabs', () => {
    it('Will return only entries with keys that parse to integers', async () => {
        utils.storageGet = jest.fn().mockResolvedValue({
            '1': 'tab1',
            '2': 'tab2',
            'settings.someKey': 'someValue',
        });
        const result = await utils.getAllTabs();
        expect(result).toEqual({
            '1': 'tab1',
            '2': 'tab2',
        });
    });
})