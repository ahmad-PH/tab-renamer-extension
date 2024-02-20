const { WebDriver, Builder, Key, By } = require('selenium-webdriver');
const { expect, test, describe } = require('@jest/globals');
const data = require('./data.js');
const logging = require('selenium-webdriver/lib/logging.js');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;
const { DriverUtils } = require('./driverUtils.js');
const { ROOT_ELEMENT_ID, INPUT_BOX_ID, SEARCH_BAR_ID, SEARCH_RESULTS_ID, ROOT_TAG_NAME, PICKED_EMOJI_ID } = require('../../src/config.js');
const express = require('express');
// eslint-disable-next-line no-unused-vars
const { sleep } = require('../../src/utils.js');
const { getLogger } = require('../../src/log');

// eslint-disable-next-line no-unused-vars
const log = getLogger('SeleniumUITests', 'debug');

// eslint-disable-next-line no-unused-vars
const SECONDS = 1000, MINUTES = 60 * SECONDS;

jest.setTimeout(10 * SECONDS);

describe('Selenium UI Tests', () => {
    /** @type {WebDriver|null} */
    let driver = null;

    /** @type {DriverUtils|null} */
    let driverUtils = null;

    const createNewDriver = async (pageLoadStrategy = 'normal') => {
        const extensionPath = process.env.EXTENSION_PATH || './dist/dev';
        if (!(await fs.lstat(extensionPath)).isDirectory()) {
            throw new Error(`The extensionPath provided: ${extensionPath} does not exist/is not a directory.`);
        }
        
        const chromeOptions = new chrome.Options()
            .addArguments(`--load-extension=${extensionPath}`)
            .addArguments('user-data-dir=/tmp/chrome-profile')
            .setPageLoadStrategy(pageLoadStrategy);
        
        if (!process.env.HEADED) {
            chromeOptions.addArguments('--headless=new')
        }

        const loggingPrefs = new logging.Preferences();
        loggingPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(chromeOptions)
            .setLoggingPrefs(loggingPrefs)
        .build();
        driverUtils = new DriverUtils(driver);
    }

    beforeEach(async () => {
        // It's better to put the deletion here, because sometimes afterEach gets messed up.
        await fs.rm('/tmp/chrome-profile', { recursive: true, force: true });
        await createNewDriver();
    });

    const tearDown = async () => { 
        if (driver) {
            const logs = await driver.manage().logs().get(logging.Type.BROWSER);
            const extensionPrefix = 'chrome-extension://klljeoabgpehcibnkgcfaipponlgpkfc/';
            // eslint-disable-next-line no-unused-vars
            const extensionLogs = logs.filter(log => (
                log.message.startsWith(extensionPrefix) && log.message.includes('#')
            )).map(log => log.message.replace(extensionPrefix, ''));
            // console.log('extension logs:', extensionLogs);
            await driver.quit();
        }
        driver = null;
        driverUtils = null;
        await fs.rm('/tmp/chrome-profile', { recursive: true, force: true });
    }

    afterEach(tearDown);
    // Make tests interrupt-friendly:
    process.on('SIGINT', tearDown);
    process.on('SIGTERM', tearDown);

    test('Can open dialog', async () => {
        await driver.get(data.websites[0].url);
        await driverUtils.openRenameDialog();
        await driver.findElement(driverUtils.shadowRootLocator.byId(ROOT_ELEMENT_ID));
    });

    test('Can rename tab', async () => {
        await driver.get(data.websites[0].url);
        const newTitle = 'New Title';
        await driverUtils.renameTab(newTitle);
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe(newTitle);
    });

    test('Input box has focus when rename dialog is opened', async () => {
        await driver.get(data.websites[0].url);

        // Click on the body so that the browser window is actually focused:
        const body = await driver.findElement(By.css('body'));
        await driver.actions().click(body).perform();

        await driverUtils.openRenameDialog();
        const activeElement = await driver.executeScript(`
            return document.querySelector('${driverUtils.shadowRootSelector}').shadowRoot.activeElement;
        `);

        expect(activeElement).not.toBeNull();
        expect(await activeElement.getAttribute('id')).toBe(INPUT_BOX_ID);
    });

    describe('Emoji picker', () => {
        test('Can set emojis', async () => {
            await driver.get(data.websites[0].url);
            await driverUtils.setFavicon('😃');
            expect(await driverUtils.faviconIsEmoji()).toBe(true);
        });

        test('Emojis not on page before emoji picker being clicked', async () => {
            await driver.get(data.websites[0].url);
            await driverUtils.openRenameDialog();
            const emojiPicker = await driver.findElement(driverUtils.shadowRootLocator.byId(ROOT_ELEMENT_ID));
            const elements = await emojiPicker.findElements(By.xpath(`.//*[contains(text(),'😃')]`));
            expect(elements.length).toBe(0);
        });

        test('Can search for emojis', async () => {
            await driver.get(data.websites[0].url);
            await driverUtils.openEmojiPicker();

            const emojiSearchBar = await driver.findElement(driverUtils.shadowRootLocator.byId(SEARCH_BAR_ID));
            await emojiSearchBar.sendKeys('halo');

            // Verify that search results contains the halo emoji
            const searchResults = await driver.findElement(driverUtils.shadowRootLocator.byId(SEARCH_RESULTS_ID));
            const xpathForEmoji = (emoji) => `.//*[contains(text(),'${emoji}')]`;
            const elements = await searchResults.findElements(By.xpath(xpathForEmoji('😇')));
            expect(elements.length).toBe(1);

            // ...and nothing else (checking a few ommon emojis as a proxy for checking all emojis)
            const commonEmojis = ['😂', '😍', '😭', '😊', '😒', '😘', '😩', '😔', '😏', '😁'];
            for (const emoji of commonEmojis) {
                const elements = await searchResults.findElements(By.xpath(xpathForEmoji(emoji)));
                expect(elements.length).toBe(0);
            }

            // Also make sure it is clickable and will set the correct favicon
            await elements[0].click()

            const pickedEmojiElement = await driver.findElement(driverUtils.shadowRootLocator.byId(PICKED_EMOJI_ID));
            const dataEmoji = await pickedEmojiElement.getAttribute('data-emoji');
            expect(dataEmoji).toBe('😇');
        });
    });

    test('Retains tab signature when tab is re-opened', async () => {
        const originalURL = data.websites[0].url;
        await driver.get(originalURL);
        const newTitle = 'New title', newFavicon = '🙃';

        await driverUtils.renameTab(newTitle);
        await driverUtils.setFavicon(newFavicon);
        
        await driverUtils.closeAndReopenCurrentTab();

        // Give the extension being tested time to load the title from storage:
        await driver.sleep(500);

        // Assert the name and emoji that we set on the tab:
        expect(await driverUtils.getTitle()).toBe(newTitle);
        expect(await driverUtils.faviconIsEmoji()).toBe(true);
            
        // Assert the name and emoji that we set in the UI:
        await driverUtils.openRenameDialog();
        expect(await driverUtils.getTitleInUI()).toBe(newTitle);
        expect(await driverUtils.getFaviconInUI()).toBe(newFavicon);
    });


    test('Retains tab signatures when window is re-opened', async () => {
        /*
            This is required because 1. driver.close() doesn't allow enough
            breathing room for chrome.tabs.onRemoved triggers to fully take 
            effect. Also, 2. if driver.close() is called on the last tab,
            thus closing the entire window, it has a similar effect.
            As a result, a dummy tab is created so that none of the 
            important tabs are the last to be closed.
        */
        await driver.switchTo().newWindow('tab'); // dummy tab

        await driver.get(data.websites[0].url);
        const signature1 = { title: 'Title1', favicon: '😀' };
        await driverUtils.setSignature(signature1.title, signature1.favicon);

        await driverUtils.openTabToURL(data.websites[1].url);

        const signature2 = { title: 'Title2', favicon: '🌟' };
        await driverUtils.setSignature(signature2.title, signature2.favicon);

        await driver.sleep(500);

        await driverUtils.closeAllTabs();
        await driver.sleep(100);
        await createNewDriver();

        await driver.get(data.websites[0].url);
        expect(await driverUtils.getTitle()).toBe(signature1.title);
        expect(await driverUtils.faviconIsEmoji()).toBe(true);

        await driverUtils.openTabToURL(data.websites[1].url);
        expect(await driverUtils.getTitle()).toBe(signature2.title);
        expect(await driverUtils.faviconIsEmoji()).toBe(true);

    }, 20 * SECONDS);

    test('Title preserver maintains title despite direct manipulation: Facebook + YouTube', async () => {
        // This test is mainly to emulate what Facebook and YouTube do.
        // Faceboook: Try to keep title set to 'Facebook' all the time.
        // YouTube: Change title when moving between videos, without triggering a reload.
        await driver.get(data.websites[0].url);
        await driverUtils.renameTab('New title');
        await driver.executeScript('document.title = "Some other title"');
        await driver.sleep(10); // give preserver time to correct the title
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe('New title');
    });

    describe('Signature restoration', () => {

        test('Restores original title when empty title passed', async () => {
            await driver.get(data.websites[0].url);
            const originalTitle = await driverUtils.getTitle();
            await driverUtils.renameTab('New title');
            await driverUtils.restoreTitle();
            const actualTitle = await driverUtils.getTitle();
            expect(actualTitle).toBe(originalTitle);
        })

        test('Restores original title when empty title passed, after being re-opened', async () => {
            await driver.get(data.websites[0].url);
            const originalTitle = await driverUtils.getTitle();
            await driverUtils.renameTab('New title');
            await driverUtils.closeAndReopenCurrentTab();
            await driverUtils.restoreTitle();
            const actualTitle = await driverUtils.getTitle();
            expect(actualTitle).toBe(originalTitle);
        });

        test('Title restoration with page-switch', async () => {
            await driver.get(data.websites[0].url);
            await driverUtils.renameTab('New title');
            await driver.sleep(20); // Give background script time to save the title. NOT SURE if it is actually needed.
            await driver.get(data.websites[1].url);
            await driverUtils.restoreTitle();
            const actualTitle = await driverUtils.getTitle();
            expect(actualTitle).toBe(data.websites[1].title);
        });

        test('Title restoration after direct title manipulation', async () => {
            await driver.get(data.websites[0].url);
            await driverUtils.renameTab('New title');
            await driver.executeScript('document.title = "Some other title"');
            await driverUtils.restoreTitle();
            const actualTitle = await driverUtils.getTitle();
            expect(actualTitle).toBe('Some other title');
        });

        test('Restores original favicon, page with no favicon <link> elements', async () => {
            await driver.get(data.googleUrl);
            await driverUtils.setFavicon('🎂');
            await driverUtils.restoreFavicon();
            await driverUtils.assertFaviconUrl(data.googleFaviconUrl);
        });
    
        test('Restores original favicon, page with favicon <link> elements', async () => {
            await driver.get(data.ahmadphosseiniUrl);
            await driverUtils.setFavicon('🎂');
            await driverUtils.restoreFavicon();
            await driverUtils.assertFaviconUrl(data.ahmadphosseiniFaviconUrl);
        });
    
        test('Favicon Restoration with page-switch', async () => {
            await driver.get(data.websites[0].url);
            await driverUtils.setFavicon('🫂');
            await driver.get(data.websites[1].url);
            await driverUtils.restoreFavicon();
            await driverUtils.assertFaviconUrl(data.websites[1].faviconUrl);
        });
    });


    test('Title loads before the page load has finished', async function() {
        await tearDown();
        await createNewDriver('none');

        const app = express();
        const port = 3000;
        let slowResponse = false;

        app.get('/', (_req, res) => {
            if (!slowResponse) {
                res.send('<html><body>A quick response!</body></html>');
            }
            if (slowResponse) {
                res.write('<html><body>');
                setTimeout(() => {
                    res.end('A slow response!</body></html>');
                }, 100);
            }
        });

        const startServer = (app, port) => {
            return new Promise((resolve, reject) => {
                const server = app.listen(port, (err) => {
                    err ? reject(err) : resolve(server)
                });
            });
        };
        let server = await startServer(app, port);

        const initialWindow = await driver.getWindowHandle();
        await driver.switchTo().newWindow('tab');
        await driver.get(`http://localhost:${port}`);
        await driverUtils.waitForPageLoad();
        await driverUtils.renameTab('New title');
        await driver.close();

        await driver.switchTo().window(initialWindow);

        let sawOneCorrectTitleWhileStillLoading = false;
        let timerId = setInterval(async () => {
            const readyState = await driver.executeScript('return document.readyState');
            const title = await driver.executeScript('return document.title');
            if (title === 'New title' && readyState === 'loading') {
                sawOneCorrectTitleWhileStillLoading = true;
            }
            // console.log('document.readyState:', readyState, ' and title: ', title, ' at time: ', new Date());
        }, 5);

        slowResponse = true;
        driver.get(`http://localhost:${port}`);
        await driverUtils.waitForPageLoad();

        clearInterval(timerId);
        server.close();

        expect(sawOneCorrectTitleWhileStillLoading).toBe(true);
    });
    
    test("Won't retrieve the same signature twice from memory: Marking tabs as !closed correctly", async () => {
        await driver.get(data.websites[0].url);
        await driverUtils.renameTab('New title');
        await driverUtils.setFavicon('📖');
        await driverUtils.closeAndReopenCurrentTab();

        await driverUtils.openTabToURL(data.websites[0].url);
        expect(await driverUtils.getTitle()).toBe(data.websites[0].title);
        expect(await driverUtils.getFaviconUrl()).toBe(data.websites[0].faviconUrl);
    });

    test("Discarded tabs reload their titles correctly", async () => {
        await driver.get(data.websites[0].url);
        await driverUtils.waitForPageLoad();
        await driverUtils.setSignature('New title', '📖');
        await driverUtils.scheduleDiscardTabEvent();
        await sleep(3 * SECONDS);

        const newTabHandle = (await driver.getAllWindowHandles())[0];
        await driver.switchTo().window(newTabHandle);

        expect(await driverUtils.getTitle()).toBe('New title');
        expect(await driverUtils.faviconIsEmoji()).toBe(true);
    });
});
