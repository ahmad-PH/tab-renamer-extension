import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';

test.describe('Tab Move', () => {
    let extensionUtils: ExtensionUtils;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        await extensionUtils.closeWelcomeTab();
    });

    test('Moves a renamed tab to index 0', async ({ page }) => {
        // Open first tab
        await page.goto(testData.websites[0].url);

        // Open second tab so we have something to move around
        await extensionUtils.openTabToURL(testData.websites[1].url);

        // Rename the current (second) tab
        const newTitle = 'Moved Tab';
        await extensionUtils.renameTab(newTitle);
        await expect(extensionUtils.page).toHaveTitle(newTitle);

        // Move the tab to index 0
        await extensionUtils.moveTabToIndex(0);

        // Wait here - you'll add assertions later
        await page.waitForTimeout(2000);
    });
});

