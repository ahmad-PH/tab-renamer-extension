import { storageGet, storageSet } from '../utils.js';

async function handleChromeUpdate() {
    const storedTabs = await storageGet(null);
    for (const tabId in storedTabs) {
        if (!storedTabs[tabId].isClosed) {
            storedTabs[tabId].isClosed = true;
            storedTabs[tabId].closedAt = new Date().toISOString();
        }
    }
    await storageSet(storedTabs);
}

export { handleChromeUpdate };