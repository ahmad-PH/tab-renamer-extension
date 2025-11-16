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
const { computeExecutablePath, Browser } = require('@puppeteer/browsers');
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

/**
 * Get the Chrome for Testing executable path using @puppeteer/browsers.
 * This assumes Chrome was installed using: npm run setup:chrome
 */
function getChromePath() {
    const cacheDir = path.resolve(__dirname, '..', '..', 'chrome-cache');
    return computeExecutablePath({
        browser: Browser.CHROME,
        buildId: 'stable',
        cacheDir: cacheDir
    });
}

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
                .setBinaryPath(getChromePath())
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