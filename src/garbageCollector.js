import { storageGet, storageSet } from "./utils.js";
import { Tab } from "./types";

/** garbage collector (gc) logger */
const gcLog = require("loglevel").getLogger("module-one")
gcLog.setLevel("SILENT"); // "DEBUG"

async function garbageCollector() {
    const allTabs = await storageGet(null);  // Added await here
    const tabsToKeepList = garabageCollectionFilter(Object.values(allTabs));
    const tabsToKeep = tabsToKeepList.reduce((accumulator, tab) => {
        accumulator[tab.id] = tab;
        return accumulator;
    }, {});
    await storageSet(tabsToKeep);
}

/**
 * @param {Tab[]} tabs - The list of tabs to filter.
 * @returns {Tab[]} - The tabs to keep.
 */
export function garabageCollectionFilter(tabs) {
    gcLog.debug('Retrieved all tab info:', JSON.stringify(tabs, null, 2));
    const currentTime = new Date();

    return tabs.filter(tab => {
        if (!tab.isClosed) {
            gcLog.debug(`Tab ${tab.id} is not closed, keeping...`);
            return true;
        } else {
            const tabClosedAt = new Date(tab.closedAt);
            gcLog.debug(`Tab ${tab.id} closed at: ${tabClosedAt}`);
            if ((currentTime.valueOf() - tabClosedAt.valueOf()) < 20000) {
                gcLog.debug(`Tab ${tab.id} was closed less than 20 seconds ago, keeping...`);
                return true;
            } else {
                gcLog.debug(`Tab ${tab.id} was closed more than 20 seconds ago, discarding...`);
                return false;
            }
        }
    });
}

export function startTheGarbageCollector() {
    setInterval(garbageCollector, 5000);
}

