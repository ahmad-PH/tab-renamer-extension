const { WebDriver, Builder, Key, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;
const { DriverUtils } = require('./driverUtils.js');
const { ROOT_ELEMENT_ID, INPUT_BOX_ID, SEARCH_BAR_ID, SEARCH_RESULTS_ID } = require('../../src/config.js');

const SECONDS = 1000;
jest.setTimeout(10 * SECONDS);

describe('Selenium UI Tests', () => {
    /** @type {WebDriver|null} */
    let driver = null;

    /** @type {DriverUtils|null} */
    let driverUtils = null;

    /** Some sample URLs to use for testing */
    const googleUrl = 'https://www.google.com/';
    const facebookUrl = 'https://www.facebook.com/';
    const googleFavicon = 'https://www.google.com/favicon.ico';
    const urls = [
        googleUrl, 
        'https://www.ahmadphosseini.com/',
        'https://motherfuckingwebsite.com/',
        facebookUrl,
        'https://www.nationalgeographic.com/'
    ]

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

    const tearDown = async () => { 
        if (driver) {
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
        await driver.get(urls[0]);
        await driverUtils.openRenameDialog();
        await driver.findElement(By.id(ROOT_ELEMENT_ID));
    });

    test('Can rename tab', async () => {
        await driver.get(urls[0]);
        const newTitle = 'New Title';
        await driverUtils.renameTab(newTitle);
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe(newTitle);
    });

    test('Input box has focus when rename dialog is opened', async () => {
        await driver.get(urls[0]);

        // Click on the body so that the browser window is actually focused:
        const body = await driver.findElement(By.css('body'));
        await driver.actions().click(body).perform();

        await driverUtils.openRenameDialog();

        const inputBox = await driver.findElement(By.id(INPUT_BOX_ID));
        const activeElement = await driver.switchTo().activeElement();

        expect(await activeElement.getAttribute('id')).toBe(await inputBox.getAttribute('id'));
    });

    test('Can set emojis', async () => {
        await driver.get(urls[0]);
        await driverUtils.setFavicon('😃');
        await driverUtils.assertEmojiSetAsFavicon();
    });

    test('Can search for emojis', async () => {
        await driver.get(urls[0]);
        await driverUtils.openEmojiPicker();

        const emojiSearchBar = await driver.findElement(By.id(SEARCH_BAR_ID));
        await emojiSearchBar.sendKeys('halo');

        // Verify that search results contains the halo emoji, and nothing else (checking a few
        // common emojis as a proxy for checking all emojis)
        const searchResults = await driver.findElement(By.id(SEARCH_RESULTS_ID));
        const xpathForEmoji = (emoji) => `.//*[contains(text(),'${emoji}')]`;
        const elements = await driver.findElements(By.xpath(xpathForEmoji('😇'), searchResults));
        expect(elements.length).toBeGreaterThan(0);

        const commonEmojis = ['😂', '😍', '😭', '😊', '😒', '😘', '😩', '😔', '😏', '😁'];
        for (const emoji of commonEmojis) {
            const elements = await driver.findElements(By.xpath(xpathForEmoji(emoji), searchResults));
            expect(elements.length).toBe(0);
        }
    });

    test('Retains tab signature when tab is re-opened', async () => {
        const originalURL = urls[0];
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

        await driver.get(urls[0]);
        const signature1 = { title: 'Title1', favicon: '😀' };
        await driverUtils.setSignature(signature1.title, signature1.favicon);

        await driverUtils.openTabToURL(urls[1]);

        const signature2 = { title: 'Title2', favicon: '🌟' };
        await driverUtils.setSignature(signature2.title, signature2.favicon);

        await driver.sleep(500);

        await driverUtils.closeAllTabs();
        await driver.sleep(100);
        await createNewDriver();

        await driver.get(urls[0]);
        expect(await driverUtils.getTitle()).toBe(signature1.title);
        await driverUtils.assertEmojiSetAsFavicon();

        await driverUtils.openTabToURL(urls[1]);
        expect(await driverUtils.getTitle()).toBe(signature2.title);
        await driverUtils.assertEmojiSetAsFavicon();

    }, 20 * SECONDS); // The timeout

    test('Restores original title when empty title passed', async () => {
        await driver.get(urls[0]);
        const originalTitle = await driverUtils.getTitle();
        await driverUtils.renameTab('New title');
        await driverUtils.renameTab('');
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe(originalTitle);
    })

    test('Restores original title when empty title passed, after being re-opened', async () => {
        await driver.get(urls[0]);
        const originalTitle = await driverUtils.getTitle();
        await driverUtils.renameTab('New title');
        await driverUtils.closeAndReopenCurrentTab();
        await driverUtils.renameTab('');
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe(originalTitle);
    })

    test('Restores original favicon when empty favicon passed', async () => {
        await driver.get(googleUrl);
        await driverUtils.setFavicon('🎂');
        await driverUtils.removeFavicon();
        await driverUtils.assertFaviconUrl(googleFavicon);
    });

    test('Title Preserver keeps the title the same', async () => {
        // This test is mainly written to emulate what Facebook does (revert the title to its original)
        // which is the only scenario where my title preserver is even required.
        await driver.get(urls[0]);
        await driverUtils.renameTab('New title');
        await driver.executeScript('document.title = "Some other title"');
        await driver.sleep(10); // give preserver time to correct the title
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe('New title');
    });
});
