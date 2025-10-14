const { WebDriver, Builder, Key, By, until } = require('selenium-webdriver');
const { expect, test, describe } = require('@jest/globals');
const chromedriver = require('chromedriver');
const express = require('express');
const path = require('path');
const data = require('./data.js');
const logging = require('selenium-webdriver/lib/logging.js');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;
const { DriverUtils } = require('./driverUtils.js');
const {
    ROOT_ELEMENT_ID,
    INPUT_BOX_ID,
    SEARCH_BAR_ID,
    SEARCH_RESULTS_ID,
    PICKED_EMOJI_ID,
    OVERLAY_ID,
    FAVICON_PICKER_ID,
    COMMAND_SET_EMOJI_STYLE,
    EMOJI_STYLE_NATIVE,
    EMOJI_STYLE_TWEMOJI,
    SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID,
    EMOJI_PICKER_ID
} = require('../../src/config.js');
// eslint-disable-next-line no-unused-vars
const { sleep } = require('../../src/utils.js');
const { getLogger } = require('../../src/log.js');
const { startExpressServer, startExpressServerWithHTML } = require('./utils.js');
let server;
            
// eslint-disable-next-line no-unused-vars
const log = getLogger('SeleniumUITests', 'warn');

// eslint-disable-next-line no-unused-vars
const SECONDS = 1000, MINUTES = 60 * SECONDS;

jest.setTimeout(10 * SECONDS);

describe('Selenium UI Tests', () => {
    /** @type {WebDriver|null} */
    let driver = null;

    /** @type {DriverUtils|null} */
    let driverUtils = null;

    // Placeholder for an express server
    /** @type {http.Server} */
    let expressServer = null;

    const createNewDriver = async (pageLoadStrategy = 'normal', test = false) => {
        const extensionPath = process.env.EXTENSION_PATH || './dist/dev';
        if (!(await fs.lstat(extensionPath)).isDirectory()) {
            throw new Error(`The extensionPath provided: ${extensionPath} does not exist/is not a directory.`);
        }
        
        let chromeOptions;
        if (test) {
            chromeOptions = new chrome.Options()
                .addArguments('user-data-dir=/tmp/chrome-profile')
                .setPageLoadStrategy(pageLoadStrategy);
        } else {
            chromeOptions = new chrome.Options()
                .setBinaryPath("/Users/ahmadph/chrome/mac_arm-139.0.7258.154/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing")
                .addArguments(`--load-extension=${extensionPath}`)
                .addArguments('user-data-dir=/tmp/chrome-profile')
                .setPageLoadStrategy(pageLoadStrategy);
        }

        // const chromeOptions = new chrome.Options()
        //     .addArguments(`--load-extension=${extensionPath}`)
        //     .addArguments('user-data-dir=/tmp/chrome-profile')
        //     .setPageLoadStrategy(pageLoadStrategy);
        
        if (!process.env.HEADED) {
            chromeOptions.addArguments('--headless=new')
        }

        const loggingPrefs = new logging.Preferences();
        loggingPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

        let chromeService = new chrome.ServiceBuilder(chromedriver.path);

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(chromeOptions)
            .setLoggingPrefs(loggingPrefs)
            .setChromeService(chromeService)
            .build();

        driverUtils = new DriverUtils(driver);

        if (process.env.HEADED) {
            await driver.get(data.websites[0].url);
            await driverUtils.closeWelcomeTab();
        }
    }

    beforeAll((done) => {
        const app = express();
        app.use('/', express.static(path.resolve(__dirname, '..', 'data', 'basic_webpage')));
        const port = 3000;
        server = app.listen(port, () => {
            done();
        });
    })

    afterAll((done) => {
        server.close(() => {
            done();
        });
    }) 

    beforeEach(async () => {
        // It's better to put the deletion here, because sometimes afterEach gets messed up.
        log.debug("Creating new driver")
        await fs.rm('/tmp/chrome-profile', { recursive: true, force: true });
        await createNewDriver();
    });

    const tearDown = async () => { 
        if (driver) {
            const logs = await driver.manage().logs().get(logging.Type.BROWSER);
            const extensionPattern = /chrome-extension:\/\/[^/]+\//;
            // eslint-disable-next-line no-unused-vars
            const extensionLogs = logs.filter(log => (
                log.message.startsWith('chrome-extension://') && log.message.includes('#')
            )).map(log => log.message.replace(extensionPattern, ''));
            log.debug('extension logs:', extensionLogs);
            await driver.quit();
        }
        driver = null;
        driverUtils = null;
        await fs.rm('/tmp/chrome-profile', { recursive: true, force: true });

        if (expressServer) {
            expressServer.close();
            expressServer = null;
        }
    }

    afterEach(() => {
        return tearDown();
    });

    // Make tests interrupt-friendly:
    process.on('SIGINT', tearDown);
    process.on('SIGTERM', tearDown);

    test('Can open and close dialog', async () => {
        await driver.get(data.websites[0].url);
        await driverUtils.openRenameDialog({doSwitchToAppIframe: false});
        const rootElement = await driver.findElement(driverUtils.shadowRootLocator.byId(ROOT_ELEMENT_ID));
        expect(await rootElement.isDisplayed()).toBe(true);

        // Pressing shortcut twice should close the dialog
        await driverUtils.openRenameDialog({intendedToClose: true, doSwitchToAppIframe: false});
        expect(await rootElement.isDisplayed()).toBe(false);

        // Pressing Escape should close the dialog
        await driverUtils.openRenameDialog({doSwitchToAppIframe: false});
        await driver.actions().sendKeys(Key.ESCAPE).perform();
        expect(await rootElement.isDisplayed()).toBe(false);

        // Clicking on the overlay should close the dialog
        await driverUtils.openRenameDialog();
        await driver.findElement(By.id(OVERLAY_ID)).click();
        await driverUtils.switchToDefaultContent();
        expect(await rootElement.isDisplayed()).toBe(false);
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
        const activeElement = await driverUtils.getIframeActiveElement();

        expect(activeElement).not.toBeNull();
        expect(await activeElement.getAttribute('id')).toBe(INPUT_BOX_ID);
    });

    describe('Emoji picker', () => {
        const emojiStyles = [EMOJI_STYLE_NATIVE, EMOJI_STYLE_TWEMOJI];
        
        describe.each(emojiStyles)('with emoji style: %s', (emojiStyle) => {
            beforeEach(async () => {
                if (!process.env.HEADED) {
                    // There is a strange difference in behaviour between headless and headed mode, where in headed 
                    // mode, you will have one page loaded always, which results in contentScript being loaded and 
                    // listeners being registered. But with headless mode, this won't happen, and no listeners
                    // registered, which means the dispatchEvent will not be received.
                    await driver.get(data.websites[0].url);
                }
                await driver.executeScript(`document.dispatchEvent(new MessageEvent('${COMMAND_SET_EMOJI_STYLE}', { data: {style: "${emojiStyle}"}}));`);
            });

            test('Can set emojis', async () => {
                await driver.get(data.websites[0].url);
                await driverUtils.setFavicon('😇');
                expect(await driverUtils.faviconIsEmoji(emojiStyle)).toBe(true);
            });

            test('Emojis not on page before emoji picker being clicked', async () => {
                await driver.get(data.websites[0].url);
                await driverUtils.openRenameDialog();
                const elements = await driver.findElements(By.xpath(`//body//*[contains(text(),'😃')]`));
                expect(elements.length).toBe(0);
            });

            test('Emoji picker search bar focused when opened, and returns focus when closed', async () => {
                await driver.get(data.websites[0].url);
                await driverUtils.openFaviconPicker();
                let activeElement = await driverUtils.getIframeActiveElement();
                expect(activeElement).not.toBeNull();
                expect(await activeElement.getAttribute('id')).toBe(SEARCH_BAR_ID);

                await driver.findElement(By.id(FAVICON_PICKER_ID)).click();
                activeElement = await driverUtils.getIframeActiveElement();
                expect(activeElement).not.toBeNull();
                expect(await activeElement.getAttribute('id')).toBe(INPUT_BOX_ID);
            });

            test('Can search for emojis', async () => {
                await driver.get(data.websites[0].url);
                await driverUtils.openFaviconPicker();

                const emojiSearchBar = await driver.findElement(By.id(SEARCH_BAR_ID));
                await emojiSearchBar.sendKeys('halo');

                // Verify that search results contains the halo emoji
                const searchResults = await driver.findElement(By.id(SEARCH_RESULTS_ID));
                await driver.wait(until.elementLocated(By.id('😇')), 10);
                const elements = await searchResults.findElements(By.id('😇'));
                expect(elements.length).toBe(1);

                // ...and nothing else (checking a few ommon emojis as a proxy for checking all emojis)
                const commonEmojis = ['😂', '😍', '😭', '😊', '😒', '😘', '😩', '😔', '😏', '😁'];
                for (const emoji of commonEmojis) {
                    const elements = await searchResults.findElements(By.id(emoji));
                    expect(elements.length).toBe(0);
                }

                // Also make sure it is clickable and will set the correct favicon
                await elements[0].click()

                const pickedEmojiElement = await driver.findElement(By.id(PICKED_EMOJI_ID));
                const dataEmoji = await pickedEmojiElement.getAttribute('data-emoji');
                expect(dataEmoji).toBe('😇');
            });
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
        await driver.sleep(100);

        // Assert the name and emoji that we set on the tab:
        expect(await driverUtils.getTitle()).toBe(newTitle);
        expect(await driverUtils.faviconIsEmoji()).toBe(true);
            
        // Assert the name and emoji that we set in the UI:
        await driverUtils.openRenameDialog();
        expect(await driverUtils.getTitleInUI()).toBe(newTitle);
        expect(await driverUtils.getFaviconInUI()).toBe(newFavicon);
    });


    test('Retains tab signatures when the entire window is re-opened', async () => { //TODO: appears to be flaky, investigate.
        /*
            Historically, this test needed a dummy tab, because driver.quit(), or calling 
            driver.close() on the last tab would shut down the driver promptly, not allowing
            enough breathing room for chrome.tabs.onRemoved to take effect.
            However, resilliency to this condition was added later to the extension, through markAllOpenSignaturesAsClosed()
            added on some listeners. Consequently, the dummy tab has been removed, and now this test checks: 
            1- Remembering a tab name after full window close (on tab2: "Title2"), and
            2- Being resillient to being abruptly shut off. (overlap with "Chrome restart handling" test)
        */
       console.log("Starting test")
        await driver.get(data.websites[0].url);
        const signature1 = { title: 'Title1', favicon: '😀' };
        await driverUtils.setSignature(signature1.title, signature1.favicon);

        console.log("About to open tab2");
        await driverUtils.openTabToURL(data.websites[1].url);

        const signature2 = { title: 'Title2', favicon: '🌟' };
        await driverUtils.setSignature(signature2.title, signature2.favicon);

        await driver.sleep(500);

        console.log("About to close all tabs");
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

    describe('Title preserver', () => {
        test('Maintains title despite direct manipulation: Facebook + YouTube', async () => {
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

        // TODO; THIS IS THE GITHUB TEST. Complete this next.
        // test('Maintains title despite manipulations to the title element: GitHub', async () => {
        //     // head > title having it's direct child removed and replaced with a new string. 
        //     const port = 3001;
        //     expressServer = await startExpressServerWithHTML(port, `
        //         <html>
        //             <head>
        //                 <title>Original title</title>
        //             </head>
        //             <body>
        //                 <p>Test Page</p>
        //             </body>
        //         </html>
        //     `);

        //     await driver.get(`http://localhost:${port}`);
        //     await driverUtils.renameTab('New title');

        //     await driver.sleep(10_000);

        //     await driver.executeScript(`
        //         const title = document.querySelector('title');
        //         title.removeChild(title.firstChild);
        //         title.appendChild(document.createTextNode('Some other title'));
        //     `);

        //     await driver.sleep(5000);

        //     const actualTitle = await driverUtils.getTitle();
        //     expect(actualTitle).toBe('New title');
        // });
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
        const port = 3001;

        let lock;
        app.get('/', (_req, res) => {
            res.write('<html><body>');
            lock.then(() => {
                return res.end('A slow response!</body></html>');
            }).catch(e => {
                console.error('Error in lock:', e);
            })
        });

        expressServer = await startExpressServer(app, port);

        const initialWindow = await driver.getWindowHandle();
        await driver.switchTo().newWindow('tab');
        lock = Promise.resolve();
        await driver.get(`http://localhost:${port}`);
        await driverUtils.waitForPageLoad();
        await driverUtils.renameTab('New title');
        await driver.close();

        await driver.switchTo().window(initialWindow);

        let resolveLock;
        lock = new Promise(resolve => {
            resolveLock = resolve;
        });
        driver.get(`http://localhost:${port}`);

        let sawOneCorrectTitleWhileStillLoading = false;
        let timerId = setInterval(async () => {
            try {
                const readyState = await driver.executeScript('return document.readyState');
                const title = await driver.executeScript('return document.title');
                if (title === 'New title' && readyState === 'loading') {
                    sawOneCorrectTitleWhileStillLoading = true;
                }
            } catch (e) {
                // There are sometimes errors here, saying the session on driver
                // has expired. I have not understood why it happens, and it 
                // seems not to have an important effect on the test.
            }
        }, 5);
        
        await sleep(100);
        resolveLock();

        await driverUtils.waitForPageLoad();

        clearInterval(timerId);

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

    test("Key event listeners on document don't get triggered when UI is active", async () => {
        const port = 3001;
        expressServer = await startExpressServerWithHTML(port, `
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

        await driver.get(`http://localhost:${port}`);
        await driverUtils.openRenameDialog();
        await driver.executeScript("document.activeElement.blur()");
        await driver.actions().sendKeys('A').perform();

        await driverUtils.switchToDefaultContent();
        let body = await driver.findElement(By.id('testContainer'));
        let bodyText = await body.getText();
        expect(bodyText).not.toContain('A key pressed');
    });

    test("Event listeners on the host page won't trigger when working with tab renamer, no matter how aggressive", async () => {
        const port = 3001;
        expressServer = await startExpressServerWithHTML(port, `
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

        await driver.get(`http://localhost:${port}`);
        
        await driver.sleep(2000);
        await driverUtils.renameTab('eel');
        await driver.sleep(7000);
        
        // Verify the rename worked
        expect(await driverUtils.getTitle()).toBe('eel');
        
        // Verify the handler was not triggered
        let captureContainer = await driver.findElement(By.id('captureContainer'));
        expect(await captureContainer.getText()).toBe('Not triggered (capture)');
    });

    describe('Settings Page', () => {
        test('Emoji style can be changed properly, and the select element remembers the selected option', async () => {
            // Go to the Settings Page and switch style to Twemoji.
            await driver.get(data.websites[0].url);
            // await driver.sleep(10_000);
            await driverUtils.openRenameDialog();
            const currentWindowHandle = await driver.getWindowHandle();
            await driverUtils.switchToNewTabAfterPerforming(async () => {
                await driverUtils.openSettingsPage();
            });
            await driver.findElement(By.id(SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID)).click();

            const twemojiOption = await driver.findElement(By.xpath("//li[contains(text(), 'Twemoji')]"));
            await twemojiOption.click();

            // Close the settings page, go back to original tab, check emoji style.
            await driver.close();
            await driver.switchTo().window(currentWindowHandle);
            
            await driverUtils.switchToAppIframe();
            await driver.findElement(By.id(FAVICON_PICKER_ID)).click();
            const emojiElement = await driver.wait(until.elementLocated(By.id('😇')), 100);
            expect(await emojiElement.getAttribute('data-style')).toBe(EMOJI_STYLE_TWEMOJI);

            // Re-open the settings page, and check that the style is still Twemoji:
            await driverUtils.switchToNewTabAfterPerforming(async () => {
                await driverUtils.openSettingsPage();
            });
            expect(await driver.findElement(By.id(SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID)).getText()).toBe("Twemoji");
        });
    });

    describe('Chrome restart handling', () => {
        test('Tab titles are restored correctly when chrome is restarted', async () => {
            await driver.get(data.websites[0].url);
            const signature = { title: 'Title1', favicon: '😀' };
            await driverUtils.setSignature(signature.title, signature.favicon);

            await driver.sleep(100);

            await driver.quit();
            await createNewDriver();

            await driver.sleep(50); // Time for the restart listener to mark all tabs as closed.

            await driver.get(data.websites[0].url);
            expect(await driverUtils.getTitle()).toBe(signature.title);
            expect(await driverUtils.faviconIsEmoji()).toBe(true);
        });
    });
});