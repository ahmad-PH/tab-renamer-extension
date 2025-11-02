import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';
import { ROOT_ELEMENT_ID, INPUT_BOX_ID, OVERLAY_ID } from '../../src/config';

test.describe('Basic Extension Operations', () => {
    let extensionUtils: ExtensionUtils;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        await page.goto(testData.websites[0].url);
        await extensionUtils.closeWelcomeTab();
    });

    test('Can open and close dialog', async ({ page }) => {
        // Open dialog
        await extensionUtils.openRenameDialog();
        const rootElement = extensionUtils.extensionFrame().getByTestId(INPUT_BOX_ID);
        await expect(rootElement).toBeVisible();

        // Pressing shortcut twice should close the dialog
        await extensionUtils.openRenameDialog();
        await expect(rootElement).not.toBeVisible();

        // Pressing Escape should close the dialog
        await extensionUtils.openRenameDialog();
        await page.keyboard.press('Escape');
        await expect(rootElement).not.toBeVisible();

        // Clicking on the overlay should close the dialog
        await extensionUtils.openRenameDialog();
        await extensionUtils.extensionFrame().getByTestId(OVERLAY_ID).click()
        await expect(rootElement).not.toBeVisible();
    });

    test('Can rename tab', async ({ page }) => {
        const newTitle = 'New Title';
        await extensionUtils.renameTab(newTitle);
        expect(page).toHaveTitle(newTitle);
    });

    test('Input box has focus when rename dialog is opened', async ({ page }) => {
        // Click on the body so that the browser window is actually focused
        await page.locator('body').click();

        await extensionUtils.openRenameDialog();

        const activeElement = await extensionUtils.getIframeActiveElement();
        
        expect(activeElement).not.toBeNull();
        if (activeElement) {
            const activeElementId = await activeElement.getAttribute('id');
            expect(activeElementId).toBe(INPUT_BOX_ID);
        }
    });
});
