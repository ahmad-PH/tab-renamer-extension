const { Key, By } = require('selenium-webdriver');
const { ROOT_ELEMENT_ID, INPUT_BOX_ID, FAVICON_PICKER_ID} = require('../src/config.js');

class DriverUtils {
    constructor(driver) {
        this.driver = driver;
    }

        async renameTab(newTabTitle) {
        await this.openRenameDialog();
        const renameBox = await this.driver.findElement(By.id(INPUT_BOX_ID));
        const newTitle = newTabTitle;
        await renameBox.sendKeys(newTitle, Key.ENTER);
    }
    
    async setFavicon(emoji) {
        await this.openRenameDialog();
        const emojiPicker = await this.driver.findElement(By.id(FAVICON_PICKER_ID));
        await emojiPicker.click();
    
        const xpath = `//*[contains(text(),'${emoji}')]`;
        const emojiElement = await this.driver.findElement(By.xpath(xpath));
        await emojiElement.click();
    
        const renameBox = await this.driver.findElement(By.id(INPUT_BOX_ID));
        await renameBox.sendKeys(Key.ENTER);
    }
    
    async assertEmojiSetAsFavicon() {
        const faviconElement = await this.driver.executeScript("return document.querySelector('link[rel*=\"icon\"]');");
        expect(await this.getAttribute(faviconElement, "rel")).toContain("icon");
        expect(await this.getAttribute(faviconElement, "href")).toMatch(/^data:image\/png;base64,/);
        expect(await this.getAttribute(faviconElement, "type")).toMatch('image/x-icon');
    }

    async openRenameDialog() {
        return await this.driver.executeScript("document.dispatchEvent(new Event('openRenameDialog'));");
    }

    async getAttribute(element, attribute) {
        return await this.driver.executeScript(`return arguments[0].getAttribute("${attribute}")`, element);
    }
}

module.exports = {
    DriverUtils
}
