import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';

test.describe('Tab Move', () => {
    test('Moving tabs around fully updates all tab indices', async ({ context }) => {
        // Step1: Open page1 and rename it
        const page1 = await context.newPage();
        const extensionUtils1 = new ExtensionUtils(page1);
        await page1.goto(testData.websites[0].url);
        await extensionUtils1.closeWelcomeTab();
        await extensionUtils1.renameTab('Initially on Index 1');

        // Step2: Open page2 to same URL and rename it
        const page2 = await context.newPage();
        await page2.goto(testData.websites[0].url);
        const extensionUtils2 = new ExtensionUtils(page2);
        await extensionUtils2.renameTab('Initially on Index 2');

        // Step3: Move the two tabs around
        await extensionUtils2.moveTabToIndex(1);

        await page1.waitForTimeout(100); // A little time for index Updater to do its job.

        await page1.close();
        await page2.close();

        // Step4: Re-open tab to index 1
        const page3 = await context.newPage();
        await page3.goto(testData.websites[0].url);
        await expect(page3).toHaveTitle("Initially on Index 2");
        await page3.close(); // Closing this to make it available in the pool again.

        // Step4: Re-open tab to index 2
        await context.newPage(); // Create dummy page just to occupy index 1
        const page4 = await context.newPage(); // So that this pagpe opens on index 2
        await page4.goto(testData.websites[0].url);
        await expect(page4).toHaveTitle("Initially on Index 1");
    });
});

