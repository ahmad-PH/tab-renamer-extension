const { garabageCollectionFilter, garbageCollectionThreshold } = require('../../src/background/garbageCollector');

describe('garabageCollectionFilter', () => {
    test('should keep the tab if it is not closed', () => {
        const tabs = [
            { id: '1', isClosed: false }
        ];
        const tabsToRemove = garabageCollectionFilter(tabs);
        expect(tabsToRemove).toEqual([]);
    });

    test('should keep the tab if it was closed recently', () => {
        const tabs = [
            { id: '1', isClosed: true, closedAt: new Date().toISOString() }
        ];
        const tabsToRemove = garabageCollectionFilter(tabs);
        expect(tabsToRemove).toEqual([]);
    });

    test('should discard the tab if it was closed long ago', () => {
        const tabs = [
            {
                id: '1',
                isClosed: true,
                closedAt: new Date(Date.now() - (garbageCollectionThreshold + 1000)).toISOString()
            }
        ];
        const result = garabageCollectionFilter(tabs);
        expect(result).toEqual(['1']);
    });
});