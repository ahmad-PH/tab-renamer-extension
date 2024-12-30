import { storageGet, storageSet } from '../utils.js';
import { getLogger } from '../log.js';

const log = getLogger('handleChromeUpdate', 'warn');

async function handleChromeUpdate() {
    log.debug('handleChromeUpdate called ...');
    const storedTabs = await storageGet(null);
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

export { handleChromeUpdate };