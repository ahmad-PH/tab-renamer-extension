import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';

test.describe('Title Preserver', () => {
    let extensionUtils: ExtensionUtils;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        await page.goto(testData.websites[0].url);
        await extensionUtils.closeWelcomeTab();
    });

    test('Maintains title despite direct manipulation: Facebook + YouTube', async ({ page }) => {
        // Emulate what Facebook and YouTube do.
        // Facebook: Try to keep title set to 'Facebook' all the time.
        // YouTube: Change title when moving between videos, without triggering a reload.
        
        await extensionUtils.renameTab('New title');
        
        // Simulate direct title manipulation like Facebook/YouTube do
        await page.evaluate(() => {
            document.title = "Some other title";
        });
        
        // Give preserver time to correct the title
        await page.waitForTimeout(10);
        
        await expect(page).toHaveTitle('New title');
    });

    test('Maintains title despite manipulations to the title element: GitHub', async ({ page }) => {
        // GitHub: head > title having its direct child removed and replaced with a new string.
        
        await extensionUtils.renameTab('New title');
        
        // Wait a bit to ensure the extension has applied the title
        await page.waitForTimeout(50);
        
        // Simulate GitHub's title manipulation - remove child and replace with new text
        await page.evaluate(() => {
            const title = document.querySelector('title');
            if (title && title.firstChild) {
                title.removeChild(title.firstChild);
                title.appendChild(document.createTextNode('Some other title'));
            }
        });
        
        // Give preserver time to correct the title
        await page.waitForTimeout(10);
        
        await expect(page).toHaveTitle('New title');
    });

    test('Maintains title after page refresh: arXiv PDF', async ({ page }) => {
        await page.goto('https://arxiv.org/pdf/1706.03762');
        
        await extensionUtils.renameTab('Attention');
        const chromeTitle = await extensionUtils.getChromeUITitle();
        expect(chromeTitle).toBe("Attention")
        
        for (let i = 0; i < 4; i++) {
            await page.reload();
            await page.waitForTimeout(1000);
            const chromeTitle = await extensionUtils.getChromeUITitle();
            expect(chromeTitle).toBe("Attention")
        }
    });
});
