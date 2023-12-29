const {findMatchingTab, loadSignature} = require('../../src/loadSignature.js');
const {Tab, TabSignature} = require('../../src/types.js');


describe('findMatchingTab', () => {
    const targetTab = {
        id: 1,
        url: 'https://www.google.com',
        windowIndex: 5,
    }
    const now = new Date().toISOString();

    test('returns correct signature when matching tabId exists', () => {
        const storedTabInfo = {
            [targetTab.id]: new Tab(targetTab.id, targetTab.url, targetTab.windowIndex, false, null,
                 new TabSignature('Google', '🔍'))
        }

        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[targetTab.id]);
    });

    test('returns null when no matching tabId and no closed tab with matching url', () => {
        const storedTabInfo = {
            2: new Tab(2, targetTab.url, 0, false, null, new TabSignature('Title', '🔍'))
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(null);
    });

    test('returns correct signature when no matching tabId and one closed tab with matching url', () => {
        const storedTabInfo = {
            2: new Tab(2, targetTab.url, 0, true, now, new TabSignature('Title', '🔍'))
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[2]);
    });

    test('returns correct signature when no matching tabId, multiple closed tabs with matching url, ' + 
        'and one matching window index', () => {
        const storedTabInfo = {
            2: new Tab(2, targetTab.url, targetTab.windowIndex, true, now, new TabSignature('Title', '🔍')),
            3: new Tab(3, targetTab.url, targetTab.windowIndex + 1, true, now, new TabSignature('Title', '🔍')),
            4: new Tab(4, targetTab.url, targetTab.windowIndex + 2, true, now, new TabSignature('Title', '🔍')),
        }
        expect(findMatchingTab(storedTabInfo, targetTab.id, targetTab.url, targetTab.windowIndex))
            .toBe(storedTabInfo[2]);
    });

    test('returns most recent signature when no matching tabId, multiple closed tabs with matching url, ' + 
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


describe('loadSignature', () => {
    test('Updates closed / closedAt after matching', () => {

    });
});