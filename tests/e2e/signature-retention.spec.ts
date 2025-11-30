import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';

test.describe('Signature Retention', () => {
    let extensionUtils: ExtensionUtils;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        await page.goto(testData.websites[0].url);
        await extensionUtils.closeWelcomeTab();
    });

    test('Retains tab signature when tab is re-opened', async ({ page }) => {
        const newTitle = 'New title';
        const newFavicon = '🙃';

        await extensionUtils.setSignature(newTitle, newFavicon);

        page = await extensionUtils.closeAndReopenCurrentTab();

        // Assert the name and emoji that we set on the tab
        await expect(page).toHaveTitle(newTitle);
        await extensionUtils.assertFaviconIsEmoji();
            
        // Assert the name and emoji that we set in the UI
        await extensionUtils.openRenameDialog();
        expect(await extensionUtils.getTitleInUI()).toBe(newTitle);
        expect(await extensionUtils.getFaviconInUI()).toBe(newFavicon);
    });

    // test('Retains tab signature when tab is re-opened after page-switch', async ({ page }) => {
    //     const newTitle = 'New title';
    //     const newFavicon = '🙃';

    //     await extensionUtils.setSignature(newTitle, newFavicon);
    //     await page.goto(testData.websites[1].url);

    //     await expect(page).toHaveTitle(newTitle);
    //     await extensionUtils.assertFaviconIsEmoji();

    //     page = await extensionUtils.closeAndReopenCurrentTab();

    //     await expect(page).toHaveTitle(newTitle);
    //     await extensionUtils.assertFaviconIsEmoji();
            
    //     // Assert the name and emoji that we set in the UI
    //     await extensionUtils.openRenameDialog();
    //     expect(await extensionUtils.getTitleInUI()).toBe(newTitle);
    //     expect(await extensionUtils.getFaviconInUI()).toBe(newFavicon);
    // });

    // DISCLAIMER: I was never able to replicate this test in playwright, due to the full-browser closure 
    // leading to extreme flakiness whenever I tried to have it. (That require user-profile setups too).
    // Not really sure if this is really needed honestly ...

    // test('Retains tab signatures when the entire window is re-opened', async ({ page, context, userDataDir }) => {
    //     /*
    //         Historically, this test needed a dummy tab, because driver.quit(), or calling 
    //         driver.close() on the last tab would shut down the driver promptly, not allowing
    //         enough breathing room for chrome.tabs.onRemoved to take effect.
    //         However, resilliency to this condition was added later to the extension, through markAllOpenSignaturesAsClosed()
    //         added on some listeners. Consequently, the dummy tab has been removed, and now this test checks: 
    //         1- Remembering a tab name after full window close (on tab2: "Title2"), and
    //         2- Being resillient to being abruptly shut off. (overlap with "Chrome restart handling" test)
    //     */
        
    //     await page.goto(testData.websites[0].url);
    //     const signature1 = { title: 'Title1', favicon: '😀' };
    //     await extensionUtils.setSignature(signature1.title, signature1.favicon);

    //     await extensionUtils.openTabToURL(testData.websites[1].url);

    //     const signature2 = { title: 'Title2', favicon: '🌟' };
    //     await extensionUtils.setSignature(signature2.title, signature2.favicon);

    //     await page.waitForTimeout(500);

    //     // Simulate browser restart using the utility function
    //     const newExtensionUtils = await ExtensionUtils.simulateBrowserRestart(context, userDataDir);
    //     await newExtensionUtils.page.waitForTimeout(500);

    //     // Navigate to the first URL and verify signature retention
    //     await newExtensionUtils.page.goto(testData.websites[0].url);
        
    //     // Wait for the extension to load and apply the signature
    //     // The extension needs time to load content scripts and apply stored signatures
    //     await newExtensionUtils.page.waitForTimeout(1000);
        
    //     // Wait for the title to be updated by the extension (with timeout)
    //     await newExtensionUtils.page.waitForFunction(
    //         () => document.title !== 'Test Page',
    //         { timeout: 5000 }
    //     ).catch(() => {
    //         // If timeout occurs, continue with the test - the assertion will fail appropriately
    //     });
        
    //     expect(await newExtensionUtils.getTitle()).toBe(signature1.title);
    //     await newExtensionUtils.assertFaviconIsEmoji();

    //     // Navigate to the second URL and verify signature retention
    //     await newExtensionUtils.openTabToURL(testData.websites[1].url);
        
    //     // Wait for the extension to load and apply the signature
    //     await newExtensionUtils.page.waitForTimeout(1000);
        
    //     // Wait for the title to be updated by the extension (with timeout)
    //     await newExtensionUtils.page.waitForFunction(
    //         () => document.title !== 'Ahmad Pourihosseini',
    //         { timeout: 5000 }
    //     ).catch(() => {
    //         // If timeout occurs, continue with the test - the assertion will fail appropriately
    //     });
        
    //     expect(await newExtensionUtils.getTitle()).toBe(signature2.title);
    //     await newExtensionUtils.assertFaviconIsEmoji();

    //     // Clean up the new context
    //     await newExtensionUtils.page.context().close();
    // });
});
