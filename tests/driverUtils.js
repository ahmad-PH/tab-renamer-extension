const { WebDriver, Key, By, until } = require('selenium-webdriver');
const { ROOT_ELEMENT_ID, INPUT_BOX_ID, FAVICON_PICKER_ID, PICKED_EMOJI_ID} = require('../src/config.js');

class DriverUtils {
    /**
     * @param {WebDriver} driver 
     */
    constructor(driver) {
        this.driver = driver;
    }

    async renameTab(newTabTitle) {
        await this.openRenameDialog();
        const renameBox = await this.driver.findElement(By.id(INPUT_BOX_ID));
        await renameBox.clear();
        await renameBox.sendKeys(newTabTitle, Key.ENTER);
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

    async setSignature(title, favicon) {
        await this.renameTab(title);
        await this.setFavicon(favicon);
    }
    
    async assertEmojiSetAsFavicon() {
        const faviconElement = await this.driver.executeScript("return document.querySelector('link[rel*=\"icon\"]');");
        expect(await this.getAttribute(faviconElement, "rel")).toContain("icon");
        expect(await this.getAttribute(faviconElement, "href")).toMatch(/^data:image\/png;base64,/);
        expect(await this.getAttribute(faviconElement, "type")).toMatch('image/x-icon');
    }

    async openRenameDialog() {
        await this.driver.executeScript("document.dispatchEvent(new Event('open_rename_dialog'));");
        await this.driver.wait(until.elementLocated(By.id(ROOT_ELEMENT_ID)));
    }

    async getAttribute(element, attribute) {
        return await this.driver.executeScript(`return arguments[0].getAttribute("${attribute}")`, element);
    }

    async getTitle() {
        return await this.driver.executeScript("return document.title;");
    }

    async openTabToURL(url) {
        const originalHandles = await this.driver.getAllWindowHandles();
        await this.driver.executeScript(`window.open("${url}", "_blank");`);
        const newHandles = await this.driver.getAllWindowHandles();
        const newTabHandle = newHandles.find(handle => !originalHandles.includes(handle));
        await this.driver.switchTo().window(newTabHandle);
        await this.driver.wait(() => {
            return this.driver.executeScript('return document.readyState').then((readyState) => {
                return readyState === 'complete';
            });
        });
    }

    async closeAllTabs() {
        let handles = await this.driver.getAllWindowHandles();
        for(let i = handles.length - 1; i >= 0; i--) {
            await this.driver.switchTo().window(handles[i]);
            await this.driver.close();
        }
    }

    async getTitleInUI() {
        const input_box = await this.driver.findElement(By.id(INPUT_BOX_ID));
        return input_box.getAttribute('value');
    }

    async getFaviconInUI() {
        try {
            const picked_emoji = await this.driver.findElement(By.id(PICKED_EMOJI_ID));
            return await picked_emoji.getAttribute('data-emoji');
        } catch (error) {
            if (error.name === 'NoSuchElementError') {
                return null;
            }
        }
    }

    async closeAndReopenCurrentTab() {
        const originalUrl = await this.driver.getCurrentUrl();
        const originalTabHandle = await this.driver.getWindowHandle();
        await this.driver.switchTo().newWindow('tab');
        const newTabHandle = await this.driver.getWindowHandle();
        await this.driver.switchTo().window(originalTabHandle);
        await this.driver.close();
        await this.driver.switchTo().window(newTabHandle);
        await this.openTabToURL(originalUrl);
    }

}

module.exports = {
    DriverUtils
}
