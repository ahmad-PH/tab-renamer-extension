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
        await page.goto(testData.websites[0].url);
        const signature = { title: 'Title1', favicon: '😀' };
        await extensionUtils.setSignature(signature.title, signature.favicon);
        await page.waitForTimeout(100);

        await context.close();
        const newBrowserContext = await restartBrowser();
        const newPage = await newBrowserContext.newPage();
        extensionUtils = new ExtensionUtils(newPage);
        await newPage.waitForTimeout(50); // Time for the restart listener to mark all tabs as closed.

        await newPage.goto(testData.websites[0].url);
        expect(await extensionUtils.getTitle()).toBe(signature.title);
        expect(await extensionUtils.faviconIsEmoji()).toBe(true);
    });
});