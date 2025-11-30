const { WebDriver, Key, By, until, WebElement } = require('selenium-webdriver');
const { 
    ROOT_ELEMENT_ID,
    INPUT_BOX_ID,
    FAVICON_PICKER_ID,
    PICKED_EMOJI_ID,
    EMOJI_REMOVE_BUTTON_ID,
    COMMAND_OPEN_RENAME_DIALOG,
    COMMAND_DISCARD_TAB,
    EMOJI_PICKER_ID,
    COMMAND_CLOSE_WELCOME_TAB,
    SETTING_BUTTON_TEST_STUB_ID,
    getEmojiStyle,
} = require('../../src/config');
const { faviconLinksCSSQuery } = require('../../src/contentScript/tab');
const { ROOT_TAG_NAME, EMOJI_STYLE_NATIVE, EMOJI_STYLE_TWEMOJI } = require('../../src/config');
const { Favicon } = require('../../src/favicon');
const { getLogger } = require('../../src/log');

// eslint-disable-next-line no-unused-vars
const log = getLogger('DriverUtils', 'warn');

class DriverUtils {
    /**
     * @param {WebDriver} driver 
     */
    constructor(driver) {
        this.driver = driver;
        this.shadowRootSelector = ROOT_TAG_NAME;
        const getShadowRootQuery = (selector) => 
            `return document.querySelector('${this.shadowRootSelector}').shadowRoot.querySelector('${selector}')`;
        
        this.shadowRootLocator = {
            byId: (id) => {
                return (driver) => driver.executeScript(getShadowRootQuery(`#${id}`));
            },
            byCSS: (css) => {
                return (driver) => driver.executeScript(getShadowRootQuery(css));
            }
        };
    }

    async getShadowRoot() {
        return await this.driver.findElement(By.css(this.shadowRootSelector)).getShadowRoot();
    }

    // =================== Iframe State Management ===================
    async isFocusedOnAppIframe() { // Takes between 3-9 ms to run
        return await this.driver.executeScript(`return document.documentElement.hasAttribute('data-tab-renamer-frame')`);
    }


    async switchToAppIframe() {
        if (!await this.isFocusedOnAppIframe()) {
            await this.driver.switchTo().frame(await this.driver.findElement(this.shadowRootLocator.byCSS('iframe')));
        }
    }

    async switchToDefaultContent() {
        if (await this.isFocusedOnAppIframe()) {
            await this.driver.switchTo().defaultContent();
        }
    }

    async withIframeContext(callback) {
        const wasInIframe = await this.isFocusedOnAppIframe();
        if (!wasInIframe) {
            await this.switchToAppIframe();
        }
        try {
            return await callback();
        } finally {
            if (!wasInIframe) {
                await this.switchToDefaultContent();
            }
        }
    }

    // ================= End: Iframe State Management ===================

    async renameTab(newTabTitle) {
        await this.openRenameDialog();
        const titleBox = await this.driver.findElement(By.id(INPUT_BOX_ID));
        await titleBox.clear();
        await titleBox.sendKeys(newTabTitle);
        await this.submitRenameDialog();
        await this.switchToDefaultContent();
    }

    async openFaviconPicker() {
        await this.openRenameDialog();
        await this.driver.findElement(By.id(FAVICON_PICKER_ID)).click();
    }
    
    async setFavicon(emoji) {
        await this.openFaviconPicker();
        
        // Wait for emoji picker to be fully visible
        const emojiPicker = await this.driver.findElement(By.id(EMOJI_PICKER_ID));
        
        // Wait for the specific emoji element to be located
        await this.driver.wait(until.elementLocated(By.id(emoji)), 5000);
        const emojiElement = await emojiPicker.findElement(By.id(emoji));
        
        // Scroll into view: Needed, or otherwise you will get:
        // "ElementClickInterceptedError: element click intercepted: Element is not clickable at point (304, 403)"
        await this.driver.executeScript('arguments[0].scrollIntoView({block: "center", behavior: "instant"});', emojiElement);
        
        // Wait a moment for any scroll animations to finish
        await this.driver.sleep(100);
        await emojiElement.click();
    
        await this.submitRenameDialog();
        await this.switchToDefaultContent();
    }

    async setSignature(title, favicon) {
        await this.renameTab(title);
        await this.setFavicon(favicon);
    }
    
    async getFaviconElement() {
        await this.switchToDefaultContent();
        const result = await this.driver.executeScript(`return document.querySelector("${faviconLinksCSSQuery}");`);
        return result;
    }

    async getFaviconUrl() {
        const faviconElement = await this.getFaviconElement();
        if (faviconElement) {
            return await this.getAttribute(faviconElement, "href");
        } else {
            const currentUrl = new URL(await this.driver.getCurrentUrl());
            let portString = currentUrl.port ? `:${currentUrl.port}` : '';
            return `${currentUrl.protocol}//${currentUrl.hostname}${portString}/favicon.ico`;
        }
    }

    async faviconIsEmoji(emojiStyle) {
        emojiStyle = emojiStyle || getEmojiStyle();
        const faviconElement = await this.getFaviconElement();
        const relContainsIcon = (await this.getAttribute(faviconElement, "rel")).includes("icon");
        let hrefIsCorrect;
        if (emojiStyle == EMOJI_STYLE_NATIVE) {
            hrefIsCorrect = (await this.getAttribute(faviconElement, "href")).startsWith("data:image/png;base64,");
        } else if (emojiStyle == EMOJI_STYLE_TWEMOJI) {
            hrefIsCorrect = (await this.getAttribute(faviconElement, "href")).startsWith("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/");
        }
        const typeMatchesIcon = (await this.getAttribute(faviconElement, "type")) === 'image/x-icon';
        return relContainsIcon && hrefIsCorrect && typeMatchesIcon;
    }

    async assertFaviconUrl(faviconUrl) {
        const faviconElement = await this.getFaviconElement();
        expect(await this.getAttribute(faviconElement, "href")).toBe(faviconUrl);
    }

    async openRenameDialog({ intendedToClose = false, doSwitchToAppIframe = true } = {}) {
        await this.driver.executeScript(`document.dispatchEvent(new Event('${COMMAND_OPEN_RENAME_DIALOG}'));`);
        await this.driver.wait(until.elementLocated(this.shadowRootLocator.byId(ROOT_ELEMENT_ID)));
        if (!intendedToClose) {
            await this.switchToAppIframe();
            await this.driver.wait(until.elementIsVisible(await this.driver.findElement(By.id(INPUT_BOX_ID))));
            await this.switchToDefaultContent();
        }
        if (doSwitchToAppIframe) {
            await this.switchToAppIframe();
        }
    }

    /**
     * Tries to click on the gear icon. You need to have opened the rename dialog first.
     */
    async openSettingsPage() {
        await this.switchToAppIframe();
        await this.driver.findElement(By.id(SETTING_BUTTON_TEST_STUB_ID)).click();
        // await this.driver.wait(until.elementLocated(this.shadowRootLocator.byId(ROOT_ELEMENT_ID)));
    }

    async getAttribute(element, attribute) {
        return await this.driver.executeScript(`return arguments[0].getAttribute("${attribute}")`, element);
    }

    async getTitle() {
        return await this.driver.executeScript("return document.title;");
    }

    async switchToNewTabAfterPerforming(action) {
        const originalHandles = await this.driver.getAllWindowHandles();
        await action();
        const newHandles = await this.driver.getAllWindowHandles();
        const newTabHandle = newHandles.find(handle => !originalHandles.includes(handle));
        await this.driver.switchTo().window(newTabHandle);
        await this.driver.wait(() => {
            return this.driver.executeScript('return document.readyState').then((readyState) => {
                return readyState === 'complete';
            });
        });
    }

    async openTabToURL(url) {
        await this.switchToNewTabAfterPerforming(() => 
            this.driver.executeScript(`window.open("${url}", "_blank");`)
        );
    }

    async closeAllTabs() {
        let handles = await this.driver.getAllWindowHandles();
        for(let i = handles.length - 1; i >= 0; i--) {
            await this.driver.switchTo().window(handles[i]);
            await this.driver.close();
        }
    }

    async getTitleInUI() {
        await this.switchToAppIframe();
        const input_box = await this.driver.findElement(By.id(INPUT_BOX_ID));
        return input_box.getAttribute('value');
    }

    async getFaviconInUI() {
        try {
            await this.switchToAppIframe();
            const picked_emoji = await this.driver.findElement(By.id(PICKED_EMOJI_ID));
            return picked_emoji.getAttribute('data-emoji');
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

    async restoreFavicon() {
        await this.openRenameDialog();
        const emojiPicker = await this.driver.findElement(By.id(FAVICON_PICKER_ID));
        await emojiPicker.click();
        const emojiRemoveButton = await this.driver.findElement(By.id(EMOJI_REMOVE_BUTTON_ID));
        emojiRemoveButton.click();
        await this.submitRenameDialog();
        await this.switchToDefaultContent();
    }

    async restoreTitle() {
        await this.renameTab('');
    }

    async submitRenameDialog() {
        const renameBox = await this.driver.findElement(By.id(INPUT_BOX_ID));
        await renameBox.sendKeys(Key.ENTER);
        await this.driver.wait(until.elementIsNotVisible(renameBox));
    }

    /**
     * This function is only needed when you specifically create a driver with pageLoadStrategy = 'none'.
     */
    async waitForPageLoad() {
        await this.driver.wait(async () => {
            const readyState = await this.driver.executeScript('return document.readyState');
            return readyState === 'complete';
        }, 10000);
    }

    async scheduleDiscardTabEvent() {
        await this.driver.executeScript(`document.dispatchEvent(new Event('${COMMAND_DISCARD_TAB}'));`);
    }

    async closeWelcomeTab() {
        await this.driver.executeScript(`document.dispatchEvent(new Event('${COMMAND_CLOSE_WELCOME_TAB}'));`);
    }

    async getIframeActiveElement() {
        this.switchToAppIframe()
        return await this.driver.executeScript(`return document.activeElement;`);
    }

}

module.exports = {
    DriverUtils
}
