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
        const originalTitle = await extensionUtils.getTitle();
        await extensionUtils.renameTab('New title');
        await extensionUtils.restoreTitle();
        const actualTitle = await extensionUtils.getTitle();
        expect(actualTitle).toBe(originalTitle);
    });

    test('Restores original title when empty title passed, after being re-opened', async ({ page }) => {
        const originalTitle = await extensionUtils.getTitle();
        await extensionUtils.renameTab('New title');
        await extensionUtils.closeAndReopenCurrentTab();
        await extensionUtils.restoreTitle();
        const actualTitle = await extensionUtils.getTitle();
        expect(actualTitle).toBe(originalTitle);
    });

    test('Title restoration with page-switch', async ({ page }) => {
        await extensionUtils.renameTab('New title');
        await page.waitForTimeout(20); // Give background script time to save the title
        await page.goto(testData.websites[1].url);
        await extensionUtils.restoreTitle();
        const actualTitle = await extensionUtils.getTitle();
        expect(actualTitle).toBe(testData.websites[1].title);
    });

    test('Title restoration after direct title manipulation', async ({ page }) => {
        await extensionUtils.renameTab('New title');
        await page.evaluate(() => {
            document.title = 'Some other title';
        });
        await extensionUtils.restoreTitle();
        const actualTitle = await extensionUtils.getTitle();
        expect(actualTitle).toBe('Some other title');
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
        await extensionUtils.assertFaviconUrl(testData.websites[1].faviconUrl as string);
    });
});
