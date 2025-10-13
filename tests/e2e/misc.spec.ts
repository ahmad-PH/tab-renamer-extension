import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import express from 'express';
import { Page } from '@playwright/test';
import { sleep, startExpressServer } from './utils';
import http from 'http';

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
        const port = 3001;

        let lock: Promise<void>;
        let resolveLock: () => void;

        app.get('/', (_req, res) => {
            res.write('<html><body>');
            lock.then(() => {
                return res.end('A slow response!</body></html>');
            }).catch(e => {
                console.error('Error in lock:', e);
            });
        });

        // Start the Express server
        expressServer = await startExpressServer(app, port);

        // First tab: Set up the title
        const firstTab = page;
        lock = Promise.resolve();
        await firstTab.goto(`http://localhost:${port}`);
        await firstTab.waitForLoadState('domcontentloaded');
        await extensionUtils.renameTab('New title');
        await firstTab.close();

        // Create a new lock for the second request
        lock = new Promise<void>((resolve) => {
            resolveLock = resolve;
        });

        const secondTab = await context.newPage();
        // Start navigation but don't wait for it to complete (no await):
        const secondTabLoadPromise = secondTab.goto(`http://localhost:${port}`);

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
        }, 5);

        await sleep(150);
        resolveLock();

        await secondTabLoadPromise;
        clearInterval(timerId);
        await secondTab.close();

        expect(sawOneCorrectTitleWhileStillLoading).toBe(true);
    });
});
