import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';

test.describe('Basic Extension Operations', () => {
    let extensionUtils: ExtensionUtils;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        
        // Navigate to test page
        await page.goto(testData.websites[0].url);
        
        // Close welcome tab if it exists
        await extensionUtils.closeWelcomeTab();
    });

    test('Can open and close dialog', async ({ page }) => {
        // Open dialog
        await extensionUtils.openRenameDialog({ doSwitchToAppIframe: false });
        const rootElement = extensionUtils.getShadowElementById('root-element');
        await expect(rootElement).toBeVisible();

        // Pressing shortcut twice should close the dialog
        await extensionUtils.openRenameDialog({ intendedToClose: true, doSwitchToAppIframe: false });
        await expect(rootElement).not.toBeVisible();

        // Pressing Escape should close the dialog
        await extensionUtils.openRenameDialog({ doSwitchToAppIframe: false });
        await page.keyboard.press('Escape');
        await expect(rootElement).not.toBeVisible();

        // Clicking on the overlay should close the dialog
        await extensionUtils.openRenameDialog();
        await extensionUtils.getShadowElementById('overlay').click();
        await extensionUtils.switchToDefaultContent();
        await expect(rootElement).not.toBeVisible();
    });

    test('Can rename tab', async ({ page }) => {
        const newTitle = 'New Title';
        await extensionUtils.renameTab(newTitle);
        const actualTitle = await extensionUtils.getTitle();
        expect(actualTitle).toBe(newTitle);
    });

    test('Input box has focus when rename dialog is opened', async ({ page }) => {
        // Click on the body so that the browser window is actually focused
        await page.locator('body').click();

        await extensionUtils.openRenameDialog();
        const activeElement = await extensionUtils.getIframeActiveElement();

        expect(activeElement).not.toBeNull();
        if (activeElement) {
            const activeElementId = await activeElement.getAttribute('id');
            expect(activeElementId).toBe('input-box');
        }
    });
});
