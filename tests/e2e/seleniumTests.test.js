const { WebDriver, Builder, Key, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;
const { DriverUtils } = require('../driverUtils.js');
const { ROOT_ELEMENT_ID } = require('../../src/config.js');

const SECONDS = 1000;
jest.setTimeout(15 * SECONDS);

describe('Selenium UI Tests', () => {
    /** @type {WebDriver|null} */
    let driver = null;

    /** @type {DriverUtils|null} */
    let driverUtils = null;

    const url1 = 'https://www.google.com/';
    // const url2 = 'https://www.example.com/';
    // const url2 = 'https://www.nationalgeographic.com/';
    const url2 = 'https://www.ahmadphosseini.com/';

    const createNewDriver = async () => {
        const extensionPath = process.env.EXTENSION_PATH || './dist/dev';
        if (!(await fs.lstat(extensionPath)).isDirectory()) {
            throw new Error(`The extensionPath provided: ${extensionPath} does not exist/is not a directory.`);
        }

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options()
                .addArguments('--headless=new')
                .addArguments(`--load-extension=${extensionPath}`)
                .addArguments('user-data-dir=/tmp/chrome-profile')
            )
        .build();
        driverUtils = new DriverUtils(driver);
    }

    beforeEach(async () => {
        await createNewDriver();
    });

    afterEach(async () => {
        await driver.quit();
        driverUtils = null;
        await fs.rm('/tmp/chrome-profile', { recursive: true, force: true });
    });

    test('Can open dialog', async () => {
        await driver.get(url1);
        await driverUtils.openRenameDialog();
        await driver.findElement(By.id(ROOT_ELEMENT_ID));
    });

    test('Can rename tab', async () => {
        await driver.get(url1);
        const newTitle = 'New Title';
        await driverUtils.renameTab(newTitle);
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe(newTitle);
    });

    test('Can set emojis', async () => {
        await driver.get(url1);
        await driverUtils.setFavicon('😃');
        await driverUtils.assertEmojiSetAsFavicon();
    });

    test('Retains tab signature when tab is re-opened', async () => {
        const originalURL = url1;
        await driver.get(originalURL);
        const newTitle = 'New title', newFavicon = '🙃';

        await driverUtils.renameTab(newTitle);
        await driverUtils.setFavicon(newFavicon);
        
        await driverUtils.closeAndReopenCurrentTab();

        // Give the extension being tested time to load the title from storage:
        await driver.sleep(500);

        // Assert the name and emoji that we set on the tab:
        expect(await driverUtils.getTitle()).toBe(newTitle);
        await driverUtils.assertEmojiSetAsFavicon();
            
        // Assert the name and emoji that we set in the UI:
        await driverUtils.openRenameDialog();
        expect(await driverUtils.getTitleInUI()).toBe(newTitle);
        expect(await driverUtils.getFaviconInUI()).toBe(newFavicon);
    });


    test('Retains tab signatures when window is re-opened', async () => {
        /*
            This is required because 1. driver.close() doesn't allow enough
            breathing room for chrome.tabs.onRemoced triggers to fully take 
            effect. Also, 2. if driver.close() is called on the last tab,
            thus closing the entire window, it has a similar effect.
            As a result, a dummy tab is created so that none of the 
            important tabs are the last to be closed.
        */
        await driver.switchTo().newWindow('tab'); // dummy tab

        await driver.get(url1);
        const signature1 = { title: 'Title1', favicon: '😀' };
        await driverUtils.setSignature(signature1.title, signature1.favicon);

        await driverUtils.openTabToURL(url2);

        const signature2 = { title: 'Title2', favicon: '🌟' };
        await driverUtils.setSignature(signature2.title, signature2.favicon);

        await driver.sleep(500);

        await driverUtils.closeAllTabs();
        await driver.sleep(100);
        await createNewDriver();

        await driver.get(url1);
        expect(await driverUtils.getTitle()).toBe(signature1.title);
        await driverUtils.assertEmojiSetAsFavicon();

        await driverUtils.openTabToURL(url2);
        expect(await driverUtils.getTitle()).toBe(signature2.title);
        await driverUtils.assertEmojiSetAsFavicon();

    }, 20 * SECONDS); // The timeout

    test('Restores original title when empty title passed', async () => {
        await driver.get(url1);
        const originalTitle = await driverUtils.getTitle();
        await driverUtils.renameTab('New title');
        await driverUtils.renameTab('');
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe(originalTitle);
    })

    test('Restores original title when empty title passed, after being re-opened', async () => {
        await driver.get(url1);
        const originalTitle = await driverUtils.getTitle();
        await driverUtils.renameTab('New title');
        await driverUtils.closeAndReopenCurrentTab();
        await driverUtils.renameTab('');
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe(originalTitle);
    })

});
