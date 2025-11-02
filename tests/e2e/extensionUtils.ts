import { Page, Locator, expect, FrameLocator, ElementHandle } from '@playwright/test';
import { 
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
    ROOT_TAG_NAME,
    EMOJI_STYLE_NATIVE,
    EMOJI_STYLE_TWEMOJI,
    COMMAND_SET_EMOJI_STYLE,
    OVERLAY_ID,
    SEARCH_BAR_ID,
    SEARCH_RESULTS_ID,
    SETTINGS_BUTTON_ID,
    SETTINGS_BUTTON_TRIGGER_AREA_ID,
} from '../../src/config.js';

import path from 'path';
import appRootPath from 'app-root-path';

export const faviconLinksCSSQuery = "html > head link[rel~='icon']";

/**
 * Playwright equivalent of DriverUtils for Chrome extension testing
 */
export class ExtensionUtils {
    public page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // =================== Dialog Operations ===================

    async openRenameDialog(): Promise<void> {
        await this.page.evaluate((command) => {
            document.dispatchEvent(new MessageEvent(command));
        }, COMMAND_OPEN_RENAME_DIALOG);

        await this.page.getByTestId(ROOT_ELEMENT_ID).waitFor({state: "attached"});
    }

    async submitRenameDialog(): Promise<void> {
        const renameBox = await this.extensionFrame().getByTestId(INPUT_BOX_ID);
        await renameBox.press('Enter');
        await renameBox.waitFor({ state: 'hidden' });
    }

    // =================== Tab Operations ===================
    
    async renameTab(newTabTitle: string): Promise<void> {
        await this.openRenameDialog();
        const titleBox = this.extensionFrame().getByTestId(INPUT_BOX_ID);
        await titleBox.clear();
        await titleBox.fill(newTabTitle);
        await this.submitRenameDialog();
    }

    async getTitleInUI(): Promise<string> {
        const titleBox = this.extensionFrame().getByTestId(INPUT_BOX_ID);
        return await titleBox.inputValue();
    }

    // =================== Favicon Operations ===================
    
    async openFaviconPicker(): Promise<void> {
        await this.openRenameDialog();
        await this.extensionFrame().getByTestId(FAVICON_PICKER_ID).click();
    }

    async setFavicon(emoji: string): Promise<void> {
        await this.openFaviconPicker();
        const emojiPicker = this.extensionFrame().getByTestId(EMOJI_PICKER_ID);
        await emojiPicker.locator(`#${emoji}`).waitFor({ state: 'visible' });
        await emojiPicker.locator(`#${emoji}`).click();
        await this.submitRenameDialog();
    }

    async getFaviconInUI(): Promise<string> {
        const pickedEmojiElement = this.extensionFrame().getByTestId(PICKED_EMOJI_ID);
        return await pickedEmojiElement.getAttribute('data-emoji') || '';
    }

    async getFaviconUrl(): Promise<string> {
        return await this.page.evaluate(() => {
            const link = document.querySelector('link[rel*="icon"]') as HTMLLinkElement;
            return link ? link.href : '';
        });
    }

    async assertFaviconIsEmoji(emojiStyle: string = EMOJI_STYLE_NATIVE) {
        await expect.poll(() => this.faviconIsEmoji(emojiStyle), {timeout: 1_000}).toBe(true);
    }

    async faviconIsEmoji(emojiStyle: string = EMOJI_STYLE_NATIVE): Promise<boolean> {
        const faviconElement = this.getFaviconElement();
        const relContainsIcon = (await faviconElement.getAttribute("rel"))?.includes("icon") || false;
        
        let hrefIsCorrect: boolean;
        if (emojiStyle == EMOJI_STYLE_NATIVE) {
            hrefIsCorrect = (await faviconElement.getAttribute("href"))?.startsWith("data:image/png;base64,") || false;
        } else if (emojiStyle == EMOJI_STYLE_TWEMOJI) {
            hrefIsCorrect = (await faviconElement.getAttribute("href"))?.startsWith("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/") || false;
        } else {
            throw new Error(`Invalid emoji style: ${emojiStyle}`);
        }

        const typeMatchesIcon = (await faviconElement.getAttribute("type")) === 'image/x-icon';
        return relContainsIcon && hrefIsCorrect && typeMatchesIcon;
    }

    getFaviconElement(): Locator {
        return this.page.locator(faviconLinksCSSQuery);
    }

    async assertFaviconUrl(expectedUrl: string): Promise<void> {
        const actualUrl = await this.getFaviconUrl();
        expect(actualUrl).toBe(expectedUrl);
    }

    async restoreFavicon(): Promise<void> {
        await this.openRenameDialog();
        await this.extensionFrame().getByTestId(FAVICON_PICKER_ID).click();
        await this.extensionFrame().getByTestId(EMOJI_REMOVE_BUTTON_ID).click();
        await this.submitRenameDialog();
    }

    async restoreTitle(): Promise<void> {
        await this.renameTab('');
        await this.page.waitForTimeout(400); // Seems necessary beacuse restoring the title involves memory operations.
    }

    // =================== Tab Management ===================
    
    async setSignature(title: string, favicon: string): Promise<void> {
        await this.renameTab(title);
        await this.setFavicon(favicon);
    }

    async closeAndReopenCurrentTab(): Promise<Page> {
        const currentUrl = this.page.url();
        await this.page.close();
        const newPage = await this.page.context().newPage();
        await newPage.goto(currentUrl, { waitUntil: 'load' });
        this.page = newPage;
        return newPage;
    }

    /**
     * This method simulates when we "cmd + shift + t" to get an old tab back, when the tab directly opens 
     * to the URLand there is no middleground where the tab exists but no URL is there yet.
     * I have forgotten why this was useful in the first place!
     * @param url 
     */
    async openTabToURL(url: string): Promise<void> {
        const pagePromise = this.page.context().waitForEvent('page');
        await this.page.evaluate(`window.open("${url}", "_blank");`);
        const newPage = await pagePromise;
        await newPage.waitForLoadState("load");
        await newPage.waitForTimeout(300);
        this.page = newPage;
    }
    async closeAllTabs(): Promise<void> {
        const pages = this.page.context().pages();
        for (const page of pages) {
            if (page !== this.page) {
                await page.close();
            }
        }
    }

    // =================== Utility Methods ===================
    

    extensionFrame(): FrameLocator {
        return this.page.locator(`#${ROOT_ELEMENT_ID} iframe`).contentFrame()
    }

    async closeWelcomeTab(): Promise<void> {
        try {
            await this.page.evaluate((command) => {
                document.dispatchEvent(new MessageEvent(command));
            }, COMMAND_CLOSE_WELCOME_TAB);
        } catch (error) {
            console.error('Error closing welcome tab:', error);
            // Welcome tab might not exist, ignore error
        }
    }

    async startConsoleMonitoring(): Promise<void> {
        this.page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning') {
                console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
            }
        });
    }

    async startNetworkMonitoring(): Promise<void> {
        this.page.on('request', request => {
            if (request.url().includes('chrome-extension://') || request.url().includes('localhost')) {
                console.log(`[NETWORK REQUEST] ${request.method()} ${request.url()}`);
            }
        });
        
        this.page.on('response', response => {
            if (response.url().includes('chrome-extension://') || response.url().includes('localhost')) {
                console.log(`[NETWORK RESPONSE] ${response.status()} ${response.url()}`);
            }
        });
    }

    async getIframeActiveElement(): Promise<ElementHandle<any> | null> {
        return (await this.extensionFrame().locator('html').evaluateHandle(() => document.activeElement)).asElement();
    }

    async scheduleDiscardTabEvent(): Promise<void> {
        await this.page.evaluate((command) => {
            document.dispatchEvent(new MessageEvent(command));
        }, COMMAND_DISCARD_TAB);
    }

    async setEmojiStyle(style: string): Promise<void> {
        await this.page.evaluate(({ command, style }) => {
            document.dispatchEvent(new MessageEvent(command, { 
                data: { style } 
            }));
        }, { command: COMMAND_SET_EMOJI_STYLE, style });
    }

    async openSettingsPage(): Promise<void> {
        await this.extensionFrame().getByTestId(SETTING_BUTTON_TEST_STUB_ID).click({ force: true, timeout: 800 });
    }

    async switchToNewTabAfterPerforming(action: () => Promise<void>): Promise<Page> {
        const newPagePromise = this.page.context().waitForEvent('page');
        await action();
        return await newPagePromise;
    }

    /**
     * Simulate browser restart by closing current context and creating a new one
     * with the same user data directory. This preserves chrome.storage data.
     * Returns a new ExtensionUtils instance for the restarted browser.
     */
    static async simulateBrowserRestart(currentContext: any): Promise<ExtensionUtils> {
        const { chromium } = await import('@playwright/test');
        
        const pathToExtension = path.join(appRootPath.path, 'dist/dev');
        const userDataDir = path.join(appRootPath.path, 'test-user-data');
        
        // Close the current context
        await currentContext.close();
        
        // Create a new context with the same user data directory
        const newContext = await chromium.launchPersistentContext(userDataDir, {
            channel: 'chromium',
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
            ],
        });

        // Create new page and return new ExtensionUtils instance
        const newPage = await newContext.newPage();
        return new ExtensionUtils(newPage);
    }
}
