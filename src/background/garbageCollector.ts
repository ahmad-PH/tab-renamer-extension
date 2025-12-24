import { tabRepository } from "../repositories/tabRepository";
import { TabInfo } from "../types";
import { getLogger } from "../log";

const log = getLogger("garbageCollector");
const SECONDS = 1000, MINUTES = 60 * SECONDS, HOURS = 60 * MINUTES;
export const garbageCollectionThreshold = 13 * HOURS;

async function garbageCollector(): Promise<void> {
    await tabRepository.runExclusive(async () => {
        const allTabs = await tabRepository.getAll();
        const tabIdsToRemove = garabageCollectionFilter(allTabs);
        await tabRepository.deleteMany(tabIdsToRemove);
    });
}

export function garabageCollectionFilter(tabs: TabInfo[]): number[] {
    log.debug('Retrieved all tab info:', JSON.stringify(tabs, null, 2));
    const currentTime = new Date();

    return tabs.filter(tab => {
        if (!tab.isClosed) {
            log.debug(`Tab ${tab.id} is not closed, keeping...`);
            return false;
        } else {
            const tabClosedAt = new Date(tab.closedAt!);
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

export function startTheGarbageCollector(): void {
    setInterval(garbageCollector, 5000);
}

