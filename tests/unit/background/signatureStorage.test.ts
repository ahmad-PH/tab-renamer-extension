import { tabRepository } from 'src/repositories/tabRepository';
import { TabInfo, TabSignature, FaviconDTO } from 'src/types';
import { storageSet, storageGet } from 'src/utils';
import { chromeStorageMock, clearChromeStorageMockData } from './chromeStorageMock';
import { getAllTabs } from 'src/utils';


describe('findMatchingTab', () => {
    const targetTab = {
        id: 1,
        url: 'https://www.google.com',
        windowIndex: 5,
    }
    const now = new Date().toISOString();
    const mockFavicon: FaviconDTO = new FaviconDTO('emoji', '🔍');

    beforeEach(() => {
        global.chrome = chromeStorageMock as any;
        clearChromeStorageMockData();
        (chromeStorageMock.storage.sync.set as jest.Mock).mockClear();
        (chromeStorageMock.storage.sync.get as jest.Mock).mockClear();
    });

    afterEach(() => {
        delete (global as any).chrome;
    });

    it('returns correct signature when matching tabId exists', async () => {
        const storedTabInfo = new TabInfo(targetTab.id, targetTab.url, targetTab.windowIndex, false, null,
                 new TabSignature('Google', mockFavicon));
        await storageSet({[targetTab.id]: storedTabInfo});

        const result = await tabRepository.findMatchingTab(targetTab.id, targetTab.url, targetTab.windowIndex);
        expect(result?.id).toBe(storedTabInfo.id);
        expect(result?.signature.title).toBe('Google');
    });

    it('returns null when no matching tabId and no closed tab with matching url', async () => {
        const storedTabInfo = new TabInfo(2, targetTab.url, 0, false, null, new TabSignature('Title', mockFavicon));
        await storageSet({2: storedTabInfo});
        
        const result = await tabRepository.findMatchingTab(targetTab.id, targetTab.url, targetTab.windowIndex);
        expect(result).toBe(null);
    });

    it('returns correct signature when no matching tabId and one closed tab with matching url', async () => {
        const storedTabInfo = new TabInfo(2, targetTab.url, 0, true, now, new TabSignature('Title', mockFavicon));
        await storageSet({2: storedTabInfo});
        
        const result = await tabRepository.findMatchingTab(targetTab.id, targetTab.url, targetTab.windowIndex);
        expect(result?.id).toBe(2);
    });

    it('returns correct signature when no matching tabId, multiple closed tabs with matching url, ' + 
        'and one matching window index', async () => {
        await storageSet({
            2: new TabInfo(2, targetTab.url, targetTab.windowIndex, true, now, new TabSignature('Title', mockFavicon)),
            3: new TabInfo(3, targetTab.url, targetTab.windowIndex + 1, true, now, new TabSignature('Title', mockFavicon)),
            4: new TabInfo(4, targetTab.url, targetTab.windowIndex + 2, true, now, new TabSignature('Title', mockFavicon)),
        });
        
        const result = await tabRepository.findMatchingTab(targetTab.id, targetTab.url, targetTab.windowIndex);
        expect(result?.id).toBe(2);
    });

    it('returns most recent signature when no matching tabId, multiple closed tabs with matching url, ' + 
        'and no matching window index', async () => {
        await storageSet({
            2: new TabInfo(2, targetTab.url, targetTab.windowIndex + 1, true, 
                new Date('2021-01-01').toISOString(), new TabSignature('Title', mockFavicon)),
            3: new TabInfo(3, targetTab.url, targetTab.windowIndex + 2, true, 
                new Date('2021-01-05').toISOString(), new TabSignature('Title', mockFavicon)),
            4: new TabInfo(4, targetTab.url, targetTab.windowIndex + 3, true, 
                new Date('2021-01-02').toISOString(), new TabSignature('Title', mockFavicon)),
        });
        
        const result = await tabRepository.findMatchingTab(targetTab.id, targetTab.url, targetTab.windowIndex);
        expect(result?.id).toBe(3);
    });
});


describe('save/loadTab', () => {
    const mockFavicon: FaviconDTO = new FaviconDTO('emoji', '🔍');

    beforeEach(() => {
        global.chrome = chromeStorageMock as any;
        clearChromeStorageMockData();
        (chromeStorageMock.storage.sync.set as jest.Mock).mockClear();
        (chromeStorageMock.storage.sync.get as jest.Mock).mockClear();
    });

    afterEach(() => {
        delete (global as any).chrome;
    });

    it('loadTabAndUpdateId updates isClosed after matching', async () => {
        await storageSet({1: new TabInfo(1, 'https://www.google.com', 5, true, null, new TabSignature('Google', mockFavicon))});
        expect((await storageGet(1)).isClosed).toBe(true);
        await tabRepository.loadTabAndUpdateId(1, 'https://www.google.com', 5, true);
        expect((await storageGet(1)).isClosed).toBe(false);
    });

    it('loadTabAndUpdateId can load signature saved with save', async () => {
        await tabRepository.save(new TabInfo(1, 'https://www.google.com', 5, false, null, new TabSignature('Google', mockFavicon)));
        const result = await tabRepository.loadTabAndUpdateId(1, 'https://www.google.com', 5, false);
        expect(result?.signature.title).toBe('Google');
        expect(result?.signature.favicon?.content).toBe('🔍');
    })

    it('loadTabAndUpdateId with isBeingOpened=true updates tabId and removes old tabId after matching', async () => {
        const sharedURL = 'https://www.google.com';
        const sharedIndex = 5;
        await storageSet({1: new TabInfo(1, sharedURL, sharedIndex, true, new Date().toISOString(),
         new TabSignature('Google', mockFavicon))});
        await tabRepository.loadTabAndUpdateId(10, sharedURL, sharedIndex, true);

        const newStoredTabInfo = await getAllTabs();
        const keys = Object.keys(newStoredTabInfo);
        expect(keys.length).toBe(1);
        expect(keys[0]).toBe('10');
        expect(newStoredTabInfo[keys[0]].id).toBe(10);
    });
});

