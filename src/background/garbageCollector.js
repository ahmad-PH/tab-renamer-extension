import { storageGet } from "../utils.js";
import { TabInfo } from "../types.js";

/** garbage collector (gc) logger */
import { getLogger } from "../log.js";
const log = getLogger("garbageCollector", "warn");
const SECONDS = 1000, MINUTES = 60 * SECONDS;
export const garbageCollectionThreshold = 2 * MINUTES;

async function garbageCollector() {
    const allTabs = await storageGet(null);  // Added await here
    const tabIdsToRemove = garabageCollectionFilter(Object.values(allTabs)).map(tabId => tabId.toString());
    await chrome.storage.sync.remove(tabIdsToRemove);
}

/**
 * @param {TabInfo[]} tabs - The list of tabs to filter.
 * @returns {number[]} - The tab ids to remove.
 */
export function garabageCollectionFilter(tabs) {
    log.debug('Retrieved all tab info:', JSON.stringify(tabs, null, 2));
    const currentTime = new Date();

    return tabs.filter(tab => {
        if (!tab.isClosed) {
            log.debug(`Tab ${tab.id} is not closed, keeping...`);
            return false;
        } else {
            const tabClosedAt = new Date(tab.closedAt);
            log.debug(`Tab ${tab.id} closed at: ${tabClosedAt}`);
            log.debug('Current time:', currentTime, 'tabClosedAt:', tabClosedAt, 'Difference:', currentTime.valueOf() - tabClosedAt.valueOf());
            if ((currentTime.valueOf() - tabClosedAt.valueOf()) < garbageCollectionThreshold) {
                log.debug(`Tab ${tab.id} was closed less than 2 minutes ago, keeping...`);
                return false;
            } else {
                log.debug(`Tab ${tab.id} was closed more than 2 minutes ago, discarding...`);
                return true;
            }
        }
    }).map(tab => tab.id);
}

export function startTheGarbageCollector() {
    setInterval(garbageCollector, 5000);
}

