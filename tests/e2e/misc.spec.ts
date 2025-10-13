import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import express from 'express';
import { Page } from '@playwright/test';
import { PromiseLock, sleep, startExpressServer, findAvailablePort } from './utils';
import http from 'http';
import testData from './testData';

test.describe('Miscellaneous Tests', () => {
    let extensionUtils: ExtensionUtils;
    let expressServer: http.Server | null;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
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

        await sleep(200);
        lock.release();

        await secondTabLoadPromise;
        clearInterval(timerId);
        await secondTab.close();

        expect(sawOneCorrectTitleWhileStillLoading).toBe(true);
    });

    test("Won't retrieve the same signature twice from memory: Marking tabs as !closed correctly", async ({ page }) => {
        await page.goto(testData.websites[0].url);
        await extensionUtils.renameTab('New title');
        await extensionUtils.setFavicon('📖');
        await extensionUtils.closeAndReopenCurrentTab();

        await extensionUtils.openTabToURL(testData.websites[0].url);
        await extensionUtils.page.pause();
        expect(await extensionUtils.getTitle()).toBe(testData.websites[0].title);
        expect(await extensionUtils.getFaviconUrl()).toBe(testData.websites[0].faviconUrl);
    });
});
