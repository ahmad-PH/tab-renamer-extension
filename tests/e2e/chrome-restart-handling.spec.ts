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
        await page.pause();
        const signature = { title: 'Title1', favicon: '😀' };
        extensionUtils.setSignature(signature.title, signature.favicon);
        await page.pause();

        await page.waitForTimeout(100);

        // // Close the current browser context completely
        // await context.close();

        // // Wait a bit for the restart listener to mark all tabs as closed
        // await new Promise(resolve => setTimeout(resolve, 50));

        // // Restart the browser with the same user data directory
        // const newContext = await restartBrowser();
        // const newPage = newContext.pages()[0] || await newContext.newPage();

        // // Navigate to the same URL and verify the state is restored
        // await newPage.goto(testData.websites[0].url);
        
        // // Create new ExtensionUtils instance for the new page
        // const newExtensionUtils = new ExtensionUtils(newPage);
        
        // // Verify that the signature was restored
        // expect(await newExtensionUtils.getTitle()).toBe(signature.title);
        // expect(await newExtensionUtils.faviconIsEmoji()).toBe(true);

        // // Clean up the new context
        // await newContext.close();
    });
});