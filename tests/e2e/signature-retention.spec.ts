import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';

test.describe('Signature Retention', () => {
    let extensionUtils: ExtensionUtils;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        
        // Navigate to test page
        await page.goto(testData.websites[0].url);
        
        // Close welcome tab if it exists
        await extensionUtils.closeWelcomeTab();
    });

    test('Retains tab signature when tab is re-opened', async ({ page }) => {
        const originalURL = testData.websites[0].url;
        const newTitle = 'New title';
        const newFavicon = '🙃';

        await extensionUtils.renameTab(newTitle);
        await extensionUtils.setFavicon(newFavicon);
        
        page = await extensionUtils.closeAndReopenCurrentTab();

        // Give the extension being tested time to load the title from storage
        await page.waitForTimeout(100);

        // Assert the name and emoji that we set on the tab
        expect(await extensionUtils.getTitle()).toBe(newTitle);
        expect(await extensionUtils.faviconIsEmoji()).toBe(true);
            
        // Assert the name and emoji that we set in the UI
        await extensionUtils.openRenameDialog();
        expect(await extensionUtils.getTitleInUI()).toBe(newTitle);
        expect(await extensionUtils.getFaviconInUI()).toBe(newFavicon);
    });

    test('Retains tab signatures when the entire window is re-opened', async ({ page, context }) => {
        /*
            Historically, this test needed a dummy tab, because driver.quit(), or calling 
            driver.close() on the last tab would shut down the driver promptly, not allowing
            enough breathing room for chrome.tabs.onRemoved to take effect.
            However, resilliency to this condition was added later to the extension, through markAllOpenSignaturesAsClosed()
            added on some listeners. Consequently, the dummy tab has been removed, and now this test checks: 
            1- Remembering a tab name after full window close (on tab2: "Title2"), and
            2- Being resillient to being abruptly shut off. (overlap with "Chrome restart handling" test)
        */
        
        await page.goto(testData.websites[0].url);
        const signature1 = { title: 'Title1', favicon: '😀' };
        await extensionUtils.setSignature(signature1.title, signature1.favicon);

        await extensionUtils.openTabToURL(testData.websites[1].url);

        const signature2 = { title: 'Title2', favicon: '🌟' };
        await extensionUtils.setSignature(signature2.title, signature2.favicon);

        await page.waitForTimeout(500);

        // Simulate browser restart using the utility function
        const newExtensionUtils = await ExtensionUtils.simulateBrowserRestart(context);
        await newExtensionUtils.page.waitForTimeout(100);

        // Navigate to the first URL and verify signature retention
        await newExtensionUtils.page.goto(testData.websites[0].url);
        expect(await newExtensionUtils.getTitle()).toBe(signature1.title);
        expect(await newExtensionUtils.faviconIsEmoji()).toBe(true);

        // Navigate to the second URL and verify signature retention
        await newExtensionUtils.openTabToURL(testData.websites[1].url);
        expect(await newExtensionUtils.getTitle()).toBe(signature2.title);
        expect(await newExtensionUtils.faviconIsEmoji()).toBe(true);

        // Clean up the new context
        await newExtensionUtils.page.context().close();
    });
});
