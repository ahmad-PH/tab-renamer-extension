const { Builder, Key, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

jest.setTimeout(10000);

test('template', async () => {
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(new chrome.Options().addArguments(
            `--load-extension=/Users/ahmadph/Desktop/Projects/TabRenamer/tab-renamer-extension/dist`
        ))
        .build();

    try {
        await driver.get('http://www.google.com');

        const body = await driver.findElement(By.css('body'));
        await body.click();

        console.log('about to click');
        await driver.executeScript("document.dispatchEvent(new Event('openRenameDialog'));");
        const renameBox = await driver.findElement(By.id('tab-renamer-extension-input-box'));
        await renameBox.sendKeys('Your Text Here');

        await driver.sleep(5000);

    } finally {
        await driver.quit();
    }
});


// TODO NEXT: I will just create a function to be called by the test via (executeScript) either on window, or through chrome.sendMessage.
// TODO: add test to test UI toggle with keyboard shortcut works as expected. Not a super-duper important test.