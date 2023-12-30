const { WebDriver, Builder, Key, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;
const { DriverUtils } = require('../helpers.js');
const { ROOT_ELEMENT_ID } = require('../../src/config.js');

jest.setTimeout(60 * 60 * 1000);
// jest.setTimeout(10 * 1000);

describe('Selenium UI Tests', () => {
    /** @type {WebDriver|null} */
    let driver = null;

    /** @type {DriverUtils|null} */
    let driverUtils = null;

    const googleURL = 'http://www.google.com';
    const natGeoURL = 'https://www.nationalgeographic.com/';

    const createNewDriver = async () => {
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options()
                .addArguments('--load-extension=/Users/ahmadph/Desktop/Projects/TabRenamer/tab-renamer-extension/dist')
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
        await driver.get(googleURL);
        await driverUtils.openRenameDialog();
        await driver.findElement(By.id(ROOT_ELEMENT_ID));
    });

    test('Can rename tab', async () => {
        await driver.get(googleURL);
        const newTitle = 'New Title';
        await driverUtils.renameTab(newTitle);
        const actualTitle = await driverUtils.getTitle();
        expect(actualTitle).toBe(newTitle);
    });

    test('Can set emojis', async () => {
        await driver.get(googleURL);
        await driverUtils.setFavicon('😃');
        await driverUtils.assertEmojiSetAsFavicon();
    });

    test('Retains tab signature when tab is re-opened', async () => {
        const originalURL = googleURL;
        await driver.get(originalURL);
        const newTitle = 'New title', newFavion = '🙃';

        await driverUtils.renameTab(newTitle);
        await driverUtils.setFavicon(newFavion);
        
        // Close and Re-open:
        const originalTabHandle = await driver.getWindowHandle();
        await driver.switchTo().newWindow('tab');
        const newTabHandle = await driver.getWindowHandle();
        await driver.switchTo().window(originalTabHandle);
        await driver.close();
        await driver.switchTo().window(newTabHandle);
        await driverUtils.openTabToURL(originalURL);

        // Give the extension being tested time to load the title from storage:
        await driver.sleep(500);

        // Assert the name and emoji that we set:
        const actualTitle = await driverUtils.getTitle();
        // debugger;
        expect(actualTitle).toBe(newTitle);

        await driverUtils.assertEmojiSetAsFavicon();
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

        await driver.get(googleURL);
        const signature1 = { title: 'Title1', favicon: '😀' };
        await driverUtils.setSignature(signature1.title, signature1.favicon);

        await driverUtils.openTabToURL(natGeoURL);

        const signature2 = { title: 'Title2', favicon: '🌟' };
        await driverUtils.setSignature(signature2.title, signature2.favicon);

        await driver.sleep(500);

        await driverUtils.closeAllTabs();
        await driver.sleep(100);
        await createNewDriver();

        await driver.get(googleURL);
        expect(await driverUtils.getTitle()).toBe(signature1.title);
        await driverUtils.assertEmojiSetAsFavicon();

        await driverUtils.openTabToURL(natGeoURL);
        expect(await driverUtils.getTitle()).toBe(signature2.title);
        await driverUtils.assertEmojiSetAsFavicon();
    });
});
