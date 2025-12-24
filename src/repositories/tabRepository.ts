import { TabInfo } from "../types";
import { storageGet, storageSet, Mutex } from "../utils";
import { getLogger } from "../log";

const log = getLogger('TabRepository');

class TabRepository {
    private mutex = new Mutex();

    runExclusive<T>(fn: () => Promise<T>): Promise<T> {
        return this.mutex.runExclusive(fn);
    }

    async getById(id: number): Promise<TabInfo | null> {
        log.debug('getById called with id:', id);
        const result = await storageGet(id) as TabInfo | undefined;
        return result || null;
    }

    async getAll(): Promise<TabInfo[]> {
        log.debug('getAll called');
        const allItems = await storageGet(null);
        const tabs = Object.entries(allItems)
            .filter(([key]) => Number.isInteger(parseInt(key)))
            .map(([_, value]) => value as TabInfo);
        log.debug('getAll returning', tabs.length, 'tabs');
        return tabs;
    }

    async save(tab: TabInfo): Promise<void> {
        log.debug('save called with:', tab);
        const existingTab = await this.getById(tab.id);
        log.debug('existing tab, which will get overridden:', existingTab);
        await storageSet({[tab.id]: tab});
        log.debug('Data saved to storage');
    }

    async delete(id: number): Promise<void> {
        log.debug('delete called with id:', id);
        await chrome.storage.sync.remove(id.toString());
    }

    async deleteMany(ids: number[]): Promise<void> {
        log.debug('deleteMany called with ids:', ids);
        const stringIds = ids.map(id => id.toString());
        await chrome.storage.sync.remove(stringIds);
    }

    async updateMany(tabs: TabInfo[]): Promise<void> {
        log.debug('updateMany called with', tabs.length, 'tabs');
        const updates: Record<string, TabInfo> = {};
        for (const tab of tabs) {
            updates[tab.id.toString()] = tab;
        }
        await storageSet(updates);
    }

    async findMatchingTab(tabId: number, url: string, index: number): Promise<TabInfo | null> {
        log.debug('findMatchingTab called with:', { tabId, url, index });
        const allTabs = await this.getAll();
        const storedTabInfo = Object.fromEntries(allTabs.map(tab => [tab.id, tab]));
        log.debug('findMatchingTab storedTabInfo: ', storedTabInfo);
        
        if (storedTabInfo[tabId]) {
            log.debug('Tab found in storedTabInfo:', storedTabInfo[tabId]);
            return storedTabInfo[tabId];
        } else {
            const candidateTabs = Object.values(storedTabInfo).filter(
                tabInfoValue => tabInfoValue.isClosed && tabInfoValue.url === url 
            );
            log.debug('candidate tabs:', candidateTabs);

            if (candidateTabs.length === 1) {
                log.debug('One closed tab with matching URL found:', candidateTabs[0]);
                return candidateTabs[0];
            } else if (candidateTabs.length > 1) {
                const tabMatchingURLAndIndex = candidateTabs.find(tabInfo => tabInfo.index === index);
                log.debug('tabMatchingURLAndIndex:', tabMatchingURLAndIndex);

                if (tabMatchingURLAndIndex) {
                    return tabMatchingURLAndIndex;
                } else {
                    candidateTabs.sort((tabInfo1, tabInfo2) => {
                        return new Date(tabInfo2.closedAt!).valueOf() - new Date(tabInfo1.closedAt!).valueOf() 
                    });
                    log.debug('Most recent tab:', candidateTabs[0]);
                    return candidateTabs[0];
                }
            }
        }

        log.debug('No matching tab found');
        return null;
    }

    async findByUrlAndClosed(url: string, isClosed: boolean): Promise<TabInfo[]> {
        log.debug('findByUrlAndClosed called with:', { url, isClosed });
        const allTabs = await this.getAll();
        return allTabs.filter(tab => tab.url === url && tab.isClosed === isClosed);
    }

    async findOldRecordOfFreshlyDiscardedTab(url: string, index: number): Promise<TabInfo | null> {
        log.debug('findOldRecordOfFreshlyDiscardedTab called with:', { url, index });
        const allTabs = await this.getAll();
        
        const candidateTabs = allTabs.filter(
            tab => !tab.isClosed && tab.url === url && tab.index === index
        );

        if (candidateTabs.length === 1) {
            log.debug('One matching tab found:', candidateTabs[0]);
            return candidateTabs[0];
        } else if (candidateTabs.length === 0) {
            log.debug('No matching tab found');
            return null;
        } else {
            throw new Error('More than one candidate tab found for freshly discarded tab. This is unexpected.');
        }
    }

    loadTabAndUpdateId(tabId: number, url: string, index: number, isBeingOpened: boolean): Promise<TabInfo | null> {
        return this.mutex.runExclusive(async () => {
            log.debug('loadTabAndUpdateId called with:', { tabId, url, index, isBeingOpened });
            
            const matchedTab = await this.findMatchingTab(tabId, url, index);

            if (matchedTab) {
                log.debug('matchedTab:', matchedTab);
                if (matchedTab.id !== tabId) { // No need to delete if the two are the same
                    await chrome.storage.sync.remove(matchedTab.id.toString());
                }
                matchedTab.id = tabId;
                if (isBeingOpened) {
                    matchedTab.isClosed = false;
                    matchedTab.closedAt = null;
                }
                await storageSet({[tabId]: matchedTab});
                return matchedTab;
            } else {
                log.debug('No matched tab info found');
                return null;
            }
        });
    }
}

export const tabRepository = new TabRepository();

