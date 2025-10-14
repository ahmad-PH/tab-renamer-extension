import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import express from 'express';
import { Page } from '@playwright/test';
import { PromiseLock, sleep, startExpressServer, findAvailablePort, startExpressServerWithHTML } from './utils';
import http from 'http';
import testData from './testData';

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
        let timerId: NodeJS.Timeout;

        // Monitor the title and readyState continuously
        timerId = setInterval(async () => {
            try {
                const readyState = await secondTab.evaluate('document.readyState');
                const title = await secondTab.evaluate('document.title');
                if (title === 'New title' && readyState === 'loading') {
                    sawOneCorrectTitleWhileStillLoading = true;
                }
            } catch (e) {
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

    test("Won't retrieve the same signature twice from memory: Marking tabs as !closed correctly", async ({ page }) => {
        await extensionUtils.renameTab('New title');
        await extensionUtils.setFavicon('📖');
        await extensionUtils.closeAndReopenCurrentTab();
        await extensionUtils.page.waitForTimeout(200); // Make sure the signature has time to get marked as loaded.

        await extensionUtils.openTabToURL(testData.websites[0].url);
        expect(await extensionUtils.getTitle()).toBe(testData.websites[0].title);
        expect(await extensionUtils.getFaviconUrl()).toBe(testData.websites[0].faviconUrl);
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
        await page.pause();
        await page.evaluate("document.activeElement.blur()");
        await page.keyboard.press('A');

        const body = await page.locator('#testContainer');
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
        await page.waitForTimeout(500);
        await page.pause()
        await extensionUtils.renameTab('eel');

        expect(await extensionUtils.getTitle()).toBe('eel');

        // Verify the handler was not triggered
        const captureContainer = await page.locator('#captureContainer');
        expect(await captureContainer.textContent()).toBe('Not triggered (capture)');
    });
});
