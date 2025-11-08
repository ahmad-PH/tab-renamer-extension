import { testWithPersistentContext, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';

testWithPersistentContext.describe('Chrome restart handling', () => {
    let extensionUtils: ExtensionUtils;

    testWithPersistentContext.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        await page.goto(testData.websites[0].url);
        await extensionUtils.closeWelcomeTab();
    });

    testWithPersistentContext('Chrome restart handling: Tab titles are restored correctly when chrome is restarted', async ({ page, context, restartBrowser }) => {
        // Set up the initial state
        const signature = { title: 'Title1', favicon: '😀' };
        await extensionUtils.setSignature(signature.title, signature.favicon);
        await page.waitForTimeout(100); // Give time for signature to get persisted to chrome storage.

        await context.close();
        const newBrowserContext = await restartBrowser();
        const newPage = await newBrowserContext.newPage();
        extensionUtils = new ExtensionUtils(newPage);
        await newPage.waitForTimeout(300); // Time for the restart listener to mark all tabs as closed.

        await newPage.goto(testData.websites[0].url);
        await expect(newPage).toHaveTitle(signature.title);
        await extensionUtils.assertFaviconIsEmoji();
    });
});