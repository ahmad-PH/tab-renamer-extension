import { getAllTabs, storageSet } from '../utils.js';
import { getLogger } from '../log.js';

const log = getLogger('markAllOpenSignaturesAsClosed', 'warn');

async function markAllOpenSignaturesAsClosed() {
    log.debug('markAllOpenSignaturesAsClosed called ...');
    const storedTabs = await getAllTabs();
    log.debug('current tabs:', storedTabs);
    for (const tabId in storedTabs) {
        if (!storedTabs[tabId].isClosed) {
            storedTabs[tabId].isClosed = true;
            storedTabs[tabId].closedAt = new Date().toISOString();
        }
    }
    log.debug('new tabs:', storedTabs);
    await storageSet(storedTabs);
}

export { markAllOpenSignaturesAsClosed };