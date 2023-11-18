const { Builder, Key, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { openRenameDialog, getAttribute } = require('./helpers.js');
// const { emojiToDataURL } = require('../src/utils.js');
// const { faviconSideLength } = require('../src/userInterface.js');

const {ROOT_ELEMENT_ID, INPUT_BOX_ID, FAVICON_PICKER_ID} = require('../src/config.js');

jest.setTimeout(10000);

describe('Selenium UI Tests', () => {
    let driver;

    beforeAll(async () => {
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome.Options().addArguments(
                `--load-extension=/Users/ahmadph/Desktop/Projects/TabRenamer/tab-renamer-extension/dist`
            ))
            .build();
    });

    afterAll(async () => {
        await driver.quit();
    });

    test('Can open dialog', async () => {
        await driver.get('http://www.google.com');
        await openRenameDialog(driver);
        await driver.findElement(By.id(ROOT_ELEMENT_ID));
    });

    test('Can rename tab', async () => {
        await driver.get('http://www.google.com');
        await openRenameDialog(driver);
        const renameBox = await driver.findElement(By.id(INPUT_BOX_ID));
        const newTitle = 'New Title';
        await renameBox.sendKeys(newTitle, Key.ENTER);

        const actualTitle = await driver.executeScript("return document.title;");
        expect(actualTitle).toBe(newTitle);
    });

    test('Can set emojis', async () => {
        await driver.get('http://www.google.com');
        await openRenameDialog(driver);
        const emojiPicker = await driver.findElement(By.id(FAVICON_PICKER_ID));
        await emojiPicker.click();

        const testEmoji = '😃';
        const xpath = `//*[contains(text(),'${testEmoji}')]`;
        const emojiElement = await driver.findElement(By.xpath(xpath));
        await emojiElement.click();

        const renameBox = await driver.findElement(By.id(INPUT_BOX_ID));
        await renameBox.sendKeys(Key.ENTER);

        const faviconElement = await driver.executeScript("return document.querySelector('link[rel*=\"icon\"]');");

        expect(await getAttribute(driver, faviconElement, "rel")).toContain("icon");
        expect(await getAttribute(driver, faviconElement, "href")).toMatch(/^data:image\/png;base64,/);
        expect(await getAttribute(driver, faviconElement, "type")).toMatch('image/x-icon');
    });
});


// TODO NEXT: I will just create a function to be called by the test via (executeScript) either on window, or through chrome.sendMessage.
// TODO: add test to test UI toggle with keyboard shortcut works as expected. Not a super-duper important test.