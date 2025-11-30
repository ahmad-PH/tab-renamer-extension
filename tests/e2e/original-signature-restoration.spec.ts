import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';

test.describe('Signature Restoration', () => {
    let extensionUtils: ExtensionUtils;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        await page.goto(testData.websites[0].url);
        await extensionUtils.closeWelcomeTab();
    });

    test('Restores original title when empty title passed', async ({ page }) => {
        const originalTitle = await page.title();
        await extensionUtils.renameTab('New title');
        await extensionUtils.restoreTitle();
        await expect(page).toHaveTitle(originalTitle);
    });

    test('Restores original title when empty title passed, after being re-opened', async ({ page }) => {
        const originalTitle = await page.title();
        await extensionUtils.renameTab('New title');
        await extensionUtils.closeAndReopenCurrentTab();
         // I find this to be important, since you want to make sure original title is loaded,
         // before attempting to "restore" it.
        await expect(extensionUtils.page).toHaveTitle('New title');
        await extensionUtils.restoreTitle();
        await expect(extensionUtils.page).toHaveTitle(originalTitle);
    });

    test('Title restoration with page-switch, regular websites', async ({ page }) => {
        await extensionUtils.renameTab('New title');
        await page.waitForTimeout(40); // Give background script time to save the title
        await page.goto(testData.websites[0].url);
        await extensionUtils.restoreTitle();
        await expect(page).toHaveTitle(testData.websites[0].title);
    });

    test('Title restoration with page-switch, GitHub-like websites', async ({ page }) => {
        await extensionUtils.renameTab('New title');
        await page.waitForTimeout(20); // Give background script time to save the title
        const gitHubIndex = testData.websites.findIndex(website => website.title.includes('GitHub'));
        await page.goto(testData.websites[gitHubIndex].url);
        await extensionUtils.restoreTitle();
        await expect(page).toHaveTitle(testData.websites[gitHubIndex].title);
    });

    test('Title restoration after direct title manipulation', async ({ page }) => {
        // This simulates the scenario where some webiste will update the tab title to either
        // convey some information, or force the title. In that case, we don't want to miss the
        // update, and revert to the newest version of the title when we restore title.
        // (My title preservers will actually preventing from "Some other title" from being shown, btw.)
        await extensionUtils.renameTab('New title');
        await page.evaluate(() => {
            document.title = 'Some other title';
        });
        await extensionUtils.restoreTitle();
        await expect(page).toHaveTitle('Some other title');
    });

    test('Restores original favicon, page with no favicon <link> elements', async ({ page }) => {
        await page.goto(testData.googleUrl);
        await extensionUtils.setFavicon('🎂');
        await extensionUtils.restoreFavicon();
        await extensionUtils.assertFaviconUrl(testData.googleFaviconUrl);
    });

    test('Restores original favicon, page with favicon <link> elements', async ({ page }) => {
        await page.goto(testData.ahmadphosseiniUrl);
        await extensionUtils.setFavicon('🎂');
        await extensionUtils.restoreFavicon();
        await extensionUtils.assertFaviconUrl(testData.ahmadphosseiniFaviconUrl);
    });

    test('Favicon Restoration with page-switch', async ({ page }) => {
        await page.goto(testData.websites[0].url);
        await extensionUtils.setFavicon('🫂');
        await page.goto(testData.websites[1].url);
        await extensionUtils.restoreFavicon();
        await extensionUtils.assertFaviconUrl(testData.websites[1].faviconUrl);
    });
});
