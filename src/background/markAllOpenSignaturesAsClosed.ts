import { tabRepository } from '../repositories/tabRepository';
import { getLogger } from '../log';

const log = getLogger('markAllOpenSignaturesAsClosed');

async function markAllOpenSignaturesAsClosed(): Promise<void> {
    const storedTabs = await tabRepository.getAll();
    log.debug(`markAllOpenSignaturesAsClosed called, with the current collection of tabs: ${JSON.stringify(storedTabs)}`);
    for (const tab of storedTabs) {
        if (!tab.isClosed) {
            tab.isClosed = true;
            tab.closedAt = new Date().toISOString();
        }
    }
    log.debug('markAllOpenSignaturesAsClosed updated tabs:', JSON.stringify(storedTabs));
    await tabRepository.updateMany(storedTabs);
}

export { markAllOpenSignaturesAsClosed };

