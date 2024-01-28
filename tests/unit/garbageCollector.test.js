const { garabageCollectionFilter } = require('../../src/background/garbageCollector');

describe('garabageCollectionFilter', () => {
    test('should keep the tab if it is not closed', () => {
        const tabs = [
            { id: '1', isClosed: false }
        ];
        const result = garabageCollectionFilter(tabs);
        expect(result).toEqual(tabs);
    });

    test('should keep the tab if it was closed recently', () => {
        const tabs = [
            { id: '1', isClosed: true, closedAt: new Date().toISOString() }
        ];
        const result = garabageCollectionFilter(tabs);
        expect(result).toEqual(tabs);
    });

    test('should discard the tab if it was closed long ago', () => {
        const tabs = [
            { id: '1', isClosed: true, closedAt: new Date(Date.now() - 21000).toISOString() }
        ];
        const result = garabageCollectionFilter(tabs);
        expect(result).toEqual([]);
    });
});