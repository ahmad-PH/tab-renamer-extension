import * as markAllOpenSignaturesAsClosedModule from 'src/background/markAllOpenSignaturesAsClosed';
const { markAllOpenSignaturesAsClosed } = markAllOpenSignaturesAsClosedModule;
import * as utils from 'src/utils';
import { TabInfo, TabSignature } from 'src/types';
import { expect } from '@jest/globals';
import chrome from './chromeMock';
global.chrome = chrome as unknown;
jest.useFakeTimers();

expect.extend({
    toBeAfter(received: string, argument: string) {
      const pass = new Date(received) > new Date(argument);
      if (pass) {
        return {
          message: () => `expected ${received} not to be after ${argument}`,
          pass: true,
        };
      } else {
        return {
          message: () => `expected ${received} to be after ${argument}`,
          pass: false,
        };
      }
    },
});


describe('markAllOpenSignaturesAsClosed', () => {
    beforeEach(() => {
        utils.storageSet = jest.fn();
    });

    it('marks all open tabs as closed with current time', async () => {
        const tab1 = new TabInfo(1, 'https://example.com', 0, false, null, new TabSignature(null, null));
        utils.storageGet = jest.fn(() => ({
            1: tab1,
        })) as any;
        const recordedTime = new Date().toISOString();

        await markAllOpenSignaturesAsClosed();
        
        const updatedStoredTabs = (utils.storageSet as jest.Mock).mock.calls[0][0];
        expect(updatedStoredTabs[1].isClosed).toBe(true);
        expect(recordedTime).not.toBeAfter(updatedStoredTabs[1].closedAt);
    });

    it('doesn\'t modify already-closed tabs', async () => {
        const sampleClosureTime = '2022-03-14T11:22:33Z';
        const tab1 = new TabInfo(1, 'https://example.com', 0, true, sampleClosureTime, new TabSignature(null, null));
        utils.storageGet = jest.fn(() => ({
            1: tab1,
        })) as any;

        await markAllOpenSignaturesAsClosed();

        expect(utils.storageSet).toHaveBeenCalledWith({
            1: expect.objectContaining({ 
                id: 1,
                isClosed: true, 
                closedAt: sampleClosureTime 
            }),
        });
    });
});

describe('markAllOpenSignaturesAsClosed regisitered correctly in the listener', () => {
    
    it('', async () => {
        let originalMarkAllOpenSignaturesAsClosed = markAllOpenSignaturesAsClosedModule.markAllOpenSignaturesAsClosed;
        (markAllOpenSignaturesAsClosedModule as any).markAllOpenSignaturesAsClosed = jest.fn();
        require('src/background/background');

        const listeners = (chrome.runtime.onInstalled.addListener as jest.Mock).mock.calls[0];
        expect(listeners).toHaveLength(1);

        const listener = listeners[0];
        await listener({reason: 'chrome_update'});

        expect((markAllOpenSignaturesAsClosedModule as any).markAllOpenSignaturesAsClosed).toHaveBeenCalledTimes(1);
        (markAllOpenSignaturesAsClosedModule as any).markAllOpenSignaturesAsClosed = originalMarkAllOpenSignaturesAsClosed;
    });
});

