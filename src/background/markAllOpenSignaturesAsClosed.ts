import { tabRepository } from '../repositories/tabRepository';
import { getLogger } from '../log';

const log = getLogger('markAllOpenSignaturesAsClosed');

async function markAllOpenSignaturesAsClosed(): Promise<void> {
    log.debug('markAllOpenSignaturesAsClosed called ...');
    const storedTabs = await tabRepository.getAll();
    log.debug('current tabs:', storedTabs);
    for (const tab of storedTabs) {
        if (!tab.isClosed) {
            tab.isClosed = true;
            tab.closedAt = new Date().toISOString();
        }
    }
    log.debug('new tabs:', storedTabs);
    await tabRepository.updateMany(storedTabs);
}

export { markAllOpenSignaturesAsClosed };

