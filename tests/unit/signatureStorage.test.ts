import { findMatchingTab, loadTab, saveTab } from 'src/background/signatureStorage';
import { TabInfo, TabSignature } from 'src/types';
import { storageSet, storageGet } from 'src/utils';
import { chromeStorageMock } from './chromeStorageMock';
import { getAllTabs } from '../../src/utils';


describe('findMatchingTab', () => {
    const targetTab = {
        id: 1,
        url: 'https://www.google.com',
        windowIndex: 5,
    }
    const now = new Date().toISOString();

    it('returns correct signature when matching tabId exists', () => {
        const storedTabInfo = {
            [targetTab.id]: new TabInfo(targetTab.id, targetTab.url, targetTab.windowIndex, false, null,
                 new TabSignature('Google', '🔍'))
        }

        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[targetTab.id]);
    });

    it('returns null when no matching tabId and no closed tab with matching url', () => {
        const storedTabInfo = {
            2: new TabInfo(2, targetTab.url, 0, false, null, new TabSignature('Title', '🔍'))
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(null);
    });

    it('returns correct signature when no matching tabId and one closed tab with matching url', () => {
        const storedTabInfo = {
            2: new TabInfo(2, targetTab.url, 0, true, now, new TabSignature('Title', '🔍'))
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[2]);
    });

    it('returns correct signature when no matching tabId, multiple closed tabs with matching url, ' + 
        'and one matching window index', () => {
        const storedTabInfo = {
            2: new TabInfo(2, targetTab.url, targetTab.windowIndex, true, now, new TabSignature('Title', '🔍')),
            3: new TabInfo(3, targetTab.url, targetTab.windowIndex + 1, true, now, new TabSignature('Title', '🔍')),
            4: new TabInfo(4, targetTab.url, targetTab.windowIndex + 2, true, now, new TabSignature('Title', '🔍')),
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[2]);
    });

    it('returns most recent signature when no matching tabId, multiple closed tabs with matching url, ' + 
        'and no matching window index', () => {
        const storedTabInfo = {
            2: new TabInfo(2, targetTab.url, targetTab.windowIndex + 1, true, 
                new Date('2021-01-01').toISOString(), new TabSignature('Title', '🔍')),
            3: new TabInfo(3, targetTab.url, targetTab.windowIndex + 2, true, 
                new Date('2021-01-05').toISOString(), new TabSignature('Title', '🔍')),
            4: new TabInfo(4, targetTab.url, targetTab.windowIndex + 3, true, 
                new Date('2021-01-02').toISOString(), new TabSignature('Title', '🔍')),
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[3]);
    });
});


describe('save/loadTab', () => {
    beforeEach(() => {
        global.chrome = chromeStorageMock as any;
        (chromeStorageMock.storage.sync.set as jest.Mock).mockClear();
        (chromeStorageMock.storage.sync.get as jest.Mock).mockClear();
    });

    afterEach(() => {
        delete (global as any).chrome;
    });

    it('loadTab updates isClosed after matching', async () => {
        await storageSet({1: new TabInfo(1, 'https://www.google.com', 5, true, null, new TabSignature('Google', '🔍'))});
        expect((await storageGet(1)).isClosed).toBe(true);
        await loadTab(1, null, null, true);
        expect((await storageGet(1)).isClosed).toBe(false);
    });

    it('loadTab can load signature saved with saveTab', async () => {
        await saveTab(new TabInfo(1, 'https://www.google.com', 5, false, null, new TabSignature('Google', '🔍')));
        const signature = (await loadTab(1, null, null, false)).signature;
        expect(signature.title).toBe('Google');
        expect(signature.favicon).toBe('🔍');
    })

    it('loadTab with isBeingOpened=true updates tabId and removes old tabId after matching', async () => {
        const sharedURL = 'https://www.google.com';
        const sharedIndex = 5;
        await storageSet({1: new TabInfo(1, sharedURL, sharedIndex, true, new Date().toISOString,
         new TabSignature('Google', '🔍'))});
        await loadTab(10, sharedURL, sharedIndex, true);

        const newStoredTabInfo = await getAllTabs();
        const keys = Object.keys(newStoredTabInfo);
        expect(keys.length).toBe(1);
        expect(keys[0]).toBe('10');
        expect(newStoredTabInfo[keys[0]].id).toBe(10);
    });
});

