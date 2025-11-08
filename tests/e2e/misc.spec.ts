import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import express from 'express';
import { PromiseLock, sleep, startExpressServer, findAvailablePort, startExpressServerWithHTML } from './utils';
import http from 'http';
import testData from './testData';
import { EMOJI_STYLE_TWEMOJI, FAVICON_PICKER_ID, SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID } from '../../src/config.js';

test.describe('Miscellaneous Tests', () => {
    let extensionUtils: ExtensionUtils;
    let expressServer: http.Server | null;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        await page.goto(testData.websites[0].url);
        await extensionUtils.closeWelcomeTab();
    });

    test.afterEach(async () => {
        if (expressServer) {
            expressServer.closeAllConnections();
            await new Promise<void>((resolve) => {
                expressServer!.close(() => {
                    resolve();
                });
            });
            expressServer = null;
        }
    });

    test('Title loads before the page load has finished', async ({ page }) => {
        const context = page.context()
        const app = express();
        const port = await findAvailablePort(3000);
        let lock: PromiseLock;

        app.get('/', (_req, res) => {
            res.write('<html><body>');
            lock.lock.then(() => {
                return res.end('A slow response!</body></html>');
            }).catch(e => {
                console.error('Error in lock:', e);
            });
        });

        expressServer = await startExpressServer(app, port);

        // First tab: Set up the title
        const firstTab = page;
        lock = new PromiseLock().release();
        await firstTab.goto(`http://localhost:${port}`);
        await firstTab.waitForLoadState('domcontentloaded');
        await extensionUtils.renameTab('New title');
        await firstTab.close();

        // Second tab: Load the page, and observe title loading behavior.
        lock = new PromiseLock();
        const secondTab = await context.newPage();
        const secondTabLoadPromise = secondTab.goto(`http://localhost:${port}`); // Don't wait for completion (no await)

        let sawOneCorrectTitleWhileStillLoading = false;
        // Monitor the title and readyState continuously
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        const timerId = setInterval(async () => {
            try {
                const readyState = await secondTab.evaluate('document.readyState');
                const title = await secondTab.evaluate('document.title');
                if (title === 'New title' && readyState === 'loading') {
                    sawOneCorrectTitleWhileStillLoading = true;
                }
            } catch {
                // There are sometimes errors here, saying the session on driver
                // has expired. I have not understood why it happens, and it 
                // seems not to have an important effect on the test.
            }
        }, 10);

        await sleep(250);
        lock.release();

        await secondTabLoadPromise;
        clearInterval(timerId);
        await secondTab.close();

        expect(sawOneCorrectTitleWhileStillLoading).toBe(true);
    });

    test("Won't retrieve the same signature twice from memory: Marking tabs as !closed correctly", async () => {
        await extensionUtils.renameTab('New title');
        await extensionUtils.setFavicon('📖');
        await extensionUtils.closeAndReopenCurrentTab();
        await expect(extensionUtils.page).toHaveTitle('New title');

        await extensionUtils.openTabToURL(testData.websites[0].url);
        await expect(extensionUtils.page).toHaveTitle(testData.websites[0].title);
        await expect.poll(() => extensionUtils.getFaviconUrl()).toBe(testData.websites[0].faviconUrl);
    });

    // Verified functionality after migration.
    test("Key event listeners on document don't get triggered when UI is active", async ({ page }) => {
        const port = await findAvailablePort(3000);
        await startExpressServerWithHTML(port, `
            <html>
                <body>
                    <p id="testContainer">Initial</p>
                    <script>
                    document.addEventListener('keydown', function(event) {
                        if (event.key === 'A') {
                            document.getElementById("testContainer").innerHTML = 'A key pressed';
                        }
                    });
                    </script>
                </body>
            </html>
        `);

        await page.goto(`http://localhost:${port}`);
        await extensionUtils.openRenameDialog();
        await page.evaluate("document.activeElement.blur()");
        await page.keyboard.press('A');

        const body = page.locator('#testContainer');
        const bodyText = await body.textContent();
        expect(bodyText).not.toContain('A key pressed');
    });

    // Verified functionality after migration.
    test("Event listeners on the host page won't trigger when working with tab renamer, no matter how aggressive", async ({ page }) => {
        const port = await findAvailablePort(3000);
        await startExpressServerWithHTML(port, `
            <html>
            <body>
                <p id="captureContainer">Not triggered (capture)</p>
                <script>
                // Capture at window level with highest possible priority
                window.addEventListener('keydown', function(event) {
                    if (event.key === 'e') {
                        window.eventWasSeen = true;
                        document.getElementById("captureContainer").innerHTML = 'Window capture triggered';
                        // Stop everything
                        event.preventDefault(); // Causes the input box to fail to capture the input event.
                        event.stopImmediatePropagation(); // Just to be extra disruptive and stop any other non-native listeners.
                        return false;
                    }
                }, { 
                    capture: true,  
                    passive: false, // Allow preventDefault
                    once: false,    // Handle all events
                });
                </script>
            </body>
            </html>
        `);

        await page.goto(`http://localhost:${port}`);
        await extensionUtils.renameTab('eel');

        await expect(page).toHaveTitle('eel');

        // Verify the handler was not triggered
        await expect(page.locator('#captureContainer')).toHaveText("Not triggered (capture)");
    });

    test('Settings Page: Emoji style can be changed properly, and the select element remembers the selected option', async ({ page }) => {
        // Close all pages other than the current one:
        for (const currentPage of page.context().pages()) {
            if (currentPage !== page) {
                await currentPage.close();
            }
        }
        
        await extensionUtils.openRenameDialog();
        await page.waitForTimeout(100);
        let settingsPage = await extensionUtils.switchToNewTabAfterPerforming(async () => {
            await extensionUtils.openSettingsPage();
        });

        await settingsPage.getByTestId(SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID).click();

        const twemojiOption = settingsPage.locator("//li[contains(text(), 'Twemoji')]");
        await twemojiOption.click();

        // // Close the settings page, go back to original tab, check emoji style.
        await settingsPage.close();
        await page.bringToFront();
        extensionUtils.page = page;
        await extensionUtils.extensionFrame().getByTestId(FAVICON_PICKER_ID).click();
        await extensionUtils.page.waitForTimeout(100);
        const emojiLocator = extensionUtils.extensionFrame().getByTestId("😇");
        await emojiLocator.waitFor({state: 'attached', timeout: 3000});
        expect(await emojiLocator.getAttribute('data-style')).toBe(EMOJI_STYLE_TWEMOJI);

        
        // Re-open the settings page, and check that the style is still Twemoji:
        settingsPage = await extensionUtils.switchToNewTabAfterPerforming(async () => {
            await extensionUtils.openSettingsPage();
        });

        await expect(settingsPage.getByTestId(SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID)).toHaveText("Twemoji");
    });
});
