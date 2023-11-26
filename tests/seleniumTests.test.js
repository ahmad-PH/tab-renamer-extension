const { WebDriver, Builder, Key, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { DriverUtils } = require('./helpers.js');

const { ROOT_ELEMENT_ID } = require('../src/config.js');

jest.setTimeout(10000);

describe('Selenium UI Tests', () => {
    /** @type {WebDriver|null} */
    let driver = null;

    /** @type {DriverUtils|null} */
    let driverUtils = null;

    beforeAll(async () => {
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().addArguments(
                `--load-extension=/Users/ahmadph/Desktop/Projects/TabRenamer/tab-renamer-extension/dist`
            ))
            .build();
        driverUtils = new DriverUtils(driver);
    });

    afterAll(async () => {
        await driver.quit();
    });

    test('Can open dialog', async () => {
        await driver.get('http://www.google.com');
        await driverUtils.openRenameDialog();
        await driver.findElement(By.id(ROOT_ELEMENT_ID));
    });

    test('Can rename tab', async () => {
        await driver.get('http://www.google.com');
        const newTitle = 'New Title';
        await driverUtils.renameTab(newTitle);
        const actualTitle = await driver.executeScript("return document.title;");
        expect(actualTitle).toBe(newTitle);
    });

    test('Can set emojis', async () => {
        await driver.get('http://www.google.com');
        await driverUtils.setFavicon('😃');
        await driverUtils.assertEmojiSetAsFavicon();
    });

    test('Retains tab name and favicon after being re-opened', async () => {
        const originalURL = 'http://www.google.com';
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
        await driver.executeScript(`window.open("${originalURL}", "_blank");`);

        // Assert the name and emoji that we set:
        

        // await driver.sleep(10000);

        // actualTitle = await driver.executeScript("return document.title;");
        // expect(actualTitle).toBe(newTitle);
        // await assertEmojiSetAsFavicon(driver);
    });
});


