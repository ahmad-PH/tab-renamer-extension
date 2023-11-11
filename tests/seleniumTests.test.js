const { Builder, Key, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { openRenameDialog } = require('./helpers.js');

const {ROOT_ELEMENT_ID, INPUT_BOX_ID, FAVICON_PICKER_ID} = require('../src/config.js');

jest.setTimeout(10000);

// test('template', async () => {
//     let driver = await new Builder()
//         .forBrowser('chrome')
//         .setChromeOptions(new chrome.Options().addArguments(
//             `--load-extension=/Users/ahmadph/Desktop/Projects/TabRenamer/tab-renamer-extension/dist`
//         ))
//         .build();

//     try {
//         await driver.get('http://www.google.com');

//         const body = await driver.findElement(By.css('body'));
//         await body.click();

//         console.log('about to click');
//         await driver.executeScript("document.dispatchEvent(new Event('openRenameDialog'));");
//         const renameBox = await driver.findElement(By.id('tab-renamer-extension-input-box'));
//         await renameBox.sendKeys('Your Text Here');

//         await driver.sleep(5000);

//     } finally {
//         await driver.quit();
//     }
// });


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

        await driver.sleep(5000);

        const actualFaviconURL = await driver.executeScript("return document.querySelector('link[rel=\"icon\"]').getAttribute('href');");

    });

});



// TODO NEXT: I will just create a function to be called by the test via (executeScript) either on window, or through chrome.sendMessage.
// TODO: add test to test UI toggle with keyboard shortcut works as expected. Not a super-duper important test.