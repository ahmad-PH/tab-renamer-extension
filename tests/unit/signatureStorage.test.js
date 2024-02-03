const { findMatchingTab, loadTab, saveTab } = require('../../src/background/signatureStorage.js');
const { Tab, TabSignature } = require('../../src/types.js');
const { storageSet, storageGet } = require('../../src/utils.js');
const { chromeStorageMock } = require('../chromeStorageMock.js');


describe('findMatchingTab', () => {
    const targetTab = {
        id: 1,
        url: 'https://www.google.com',
        windowIndex: 5,
    }
    const now = new Date().toISOString();

    it('returns correct signature when matching tabId exists', () => {
        const storedTabInfo = {
            [targetTab.id]: new Tab(targetTab.id, targetTab.url, targetTab.windowIndex, false, null,
                 new TabSignature('Google', '🔍'))
        }

        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[targetTab.id]);
    });

    it('returns null when no matching tabId and no closed tab with matching url', () => {
        const storedTabInfo = {
            2: new Tab(2, targetTab.url, 0, false, null, new TabSignature('Title', '🔍'))
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(null);
    });

    it('returns correct signature when no matching tabId and one closed tab with matching url', () => {
        const storedTabInfo = {
            2: new Tab(2, targetTab.url, 0, true, now, new TabSignature('Title', '🔍'))
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[2]);
    });

    it('returns correct signature when no matching tabId, multiple closed tabs with matching url, ' + 
        'and one matching window index', () => {
        const storedTabInfo = {
            2: new Tab(2, targetTab.url, targetTab.windowIndex, true, now, new TabSignature('Title', '🔍')),
            3: new Tab(3, targetTab.url, targetTab.windowIndex + 1, true, now, new TabSignature('Title', '🔍')),
            4: new Tab(4, targetTab.url, targetTab.windowIndex + 2, true, now, new TabSignature('Title', '🔍')),
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[2]);
    });

    it('returns most recent signature when no matching tabId, multiple closed tabs with matching url, ' + 
        'and no matching window index', () => {
        const storedTabInfo = {
            2: new Tab(2, targetTab.url, targetTab.windowIndex + 1, true, 
                new Date('2021-01-01').toISOString(), new TabSignature('Title', '🔍')),
            3: new Tab(3, targetTab.url, targetTab.windowIndex + 2, true, 
                new Date('2021-01-05').toISOString(), new TabSignature('Title', '🔍')),
            4: new Tab(4, targetTab.url, targetTab.windowIndex + 3, true, 
                new Date('2021-01-02').toISOString(), new TabSignature('Title', '🔍')),
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[3]);
    });
});


describe('save/loadTab', () => {
    beforeEach(() => {
        global.chrome = chromeStorageMock;
        chromeStorageMock.storage.sync.set.mockClear();
        chromeStorageMock.storage.sync.get.mockClear();
    });

    afterEach(() => {
        delete global.chrome;
    });

    it('loadTab updates isClosed after matching', async () => {
        await storageSet({1: new Tab(1, 'https://www.google.com', 5, true, null, new TabSignature('Google', '🔍'))});
        expect((await storageGet(1)).isClosed).toBe(true);
        await loadTab(1, null, null, true);
        expect((await storageGet(1)).isClosed).toBe(false);
    });

    it('loadTab can load signature saved with saveTab', async () => {
        await saveTab(new Tab(1, 'https://www.google.com', 5, false, null, new TabSignature('Google', '🔍')));
        const signature = (await loadTab(1, null, null, false)).signature;
        expect(signature.title).toBe('Google');
        expect(signature.favicon).toBe('🔍');
    })

    it('loadTab with isBeingOpened=true updates tabId and removes old tabId after matching', async () => {
        const sharedURL = 'https://www.google.com';
        const sharedIndex = 5;
        await storageSet({1: new Tab(1, sharedURL, sharedIndex, true, new Date().toISOString,
         new TabSignature('Google', '🔍'))});
        await loadTab(10, sharedURL, sharedIndex, true);

        // Assert:
        const newStoredTabInfo = await storageGet(null);
        const keys = Object.keys(newStoredTabInfo);
        expect(keys.length).toBe(1);
        expect(keys[0]).toBe('10');
        expect(newStoredTabInfo[keys[0]].id).toBe(10);
    });
});