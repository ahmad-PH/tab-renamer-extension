const { WebDriver, Builder, Key, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs').promises;
const { DriverUtils } = require('./helpers.js');

const { ROOT_ELEMENT_ID } = require('../src/config.js');

jest.setTimeout(60 * 60000);

describe('Selenium UI Tests', () => {
    /** @type {WebDriver|null} */
    let driver = null;

    /** @type {DriverUtils|null} */
    let driverUtils = null;

    const googleURL = 'http://www.google.com';

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

    test('Retains tab signature after being re-opened', async () => {
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
        expect(actualTitle).toBe(newTitle);
        await driverUtils.assertEmojiSetAsFavicon();
    });

    test('Retains tab signature when window is re-opened', async () => {
        await driver.get(googleURL);
        await driverUtils.setSignature('Title1', '😀');

        await driverUtils.openTabToURL('http://yahoo.com');

        await driverUtils.setSignature('Title2', '🌟');

        await driver.sleep(1000);

        await driver.close();

        await driver.sleep(2000);

        await driver.quit();

        await createNewDriver();

        await driver.get(googleURL);
        await driverUtils.openTabToURL('http://yahoo.com');

        await driver.sleep(60 * 60000);

        //TODO: debug: When the tabs are re-opened, only one of the tabs is 
    });
});


