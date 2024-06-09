const { handleChromeUpdate } = require('src/background/handleChromeUpdate');
const utils = require('src/utils');
const { expect } = require('@jest/globals');

// Add custom matcher for comparing dates
expect.extend({
    toBeAfter(received, argument) {
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


describe('handleChromeUpdate', () => {
    beforeEach(() => {
        utils.storageSet = jest.fn();
    });

    it('marks all open tabs as closed with current time', async () => {
        utils.storageGet = jest.fn(() => ({
            1: { isClosed: false, closedAt: null },
        }));
        const recordedTime = new Date().toISOString();

        await handleChromeUpdate();
        
        const updatedStoredTabs = utils.storageSet.mock.calls[0][0];
        expect(updatedStoredTabs[1].isClosed).toBe(true);
        expect(recordedTime).not.toBeAfter(updatedStoredTabs[1].closedAt);
    });

    it('doesn\'t modify already-closed tabs', async () => {
        const sampleClosureTime = '2022-03-14T11:22:33Z';
        utils.storageGet = jest.fn(() => ({
            1: { isClosed: true, closedAt: sampleClosureTime },
        }));

        await handleChromeUpdate();

        expect(utils.storageSet).toHaveBeenCalledWith({
            1: { isClosed: true, closedAt: sampleClosureTime },
        });
    });
});