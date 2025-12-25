import {
    cleanupStaleEntries,
    STALE_ENTRY_THRESHOLD_MS
} from 'src/background/titleChangeHandler';

describe('cleanupStaleEntries', () => {
    test('should remove entries older than the threshold', () => {
        const now = Date.now();
        const state: Record<number, { lastTime: number; retriesUsed: number }> = {
            1: { lastTime: now - STALE_ENTRY_THRESHOLD_MS - 1000, retriesUsed: 0 },
            2: { lastTime: now - STALE_ENTRY_THRESHOLD_MS - 5000, retriesUsed: 2 }
        };

        cleanupStaleEntries(state);

        expect(state[1]).toBeUndefined();
        expect(state[2]).toBeUndefined();
    });

    test('should keep entries newer than the threshold', () => {
        const now = Date.now();
        const state: Record<number, { lastTime: number; retriesUsed: number }> = {
            1: { lastTime: now - 1000, retriesUsed: 0 },
            2: { lastTime: now - STALE_ENTRY_THRESHOLD_MS + 1000, retriesUsed: 1 }
        };

        cleanupStaleEntries(state);

        expect(state[1]).toBeDefined();
        expect(state[2]).toBeDefined();
    });

    test('should remove stale entries while keeping fresh ones', () => {
        const now = Date.now();
        const state: Record<number, { lastTime: number; retriesUsed: number }> = {
            1: { lastTime: now - STALE_ENTRY_THRESHOLD_MS + 1000, retriesUsed: 0 },
            2: { lastTime: now - STALE_ENTRY_THRESHOLD_MS - 10000, retriesUsed: 3 }
        };

        cleanupStaleEntries(state);

        expect(state[1]).toBeDefined();
        expect(state[2]).toBeUndefined();
    });

    test('should handle empty state', () => {
        const state: Record<number, { lastTime: number }> = {};
        cleanupStaleEntries(state);
        expect(Object.keys(state)).toHaveLength(0);
    });
});
