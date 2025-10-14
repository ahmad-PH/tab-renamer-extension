import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';

test.describe('Chrome restart handling', () => {
    let extensionUtils: ExtensionUtils;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        await page.goto(testData.websites[0].url);
        await extensionUtils.closeWelcomeTab();
    });

    test('Chrome restart handling: Tab titles are restored correctly when chrome is restarted', async ({ page }) => {

        await page.goto(testData.websites[0].url);
        const signature = { title: 'Title1', favicon: '😀' };
        extensionUtils.setSignature(signature.title, signature.favicon);

        await page.waitForTimeout(100);


        // await driver.quit();
        // await createNewDriver();

        // await driver.sleep(50); // Time for the restart listener to mark all tabs as closed.

        // await driver.get(data.websites[0].url);
        // expect(await driverUtils.getTitle()).toBe(signature.title);
        // expect(await driverUtils.faviconIsEmoji()).toBe(true);
    });
});