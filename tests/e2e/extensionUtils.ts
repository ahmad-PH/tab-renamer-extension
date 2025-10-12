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

        await expect(this.page.getByTestId(ROOT_ELEMENT_ID)).toBeAttached();
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

    async getTitle(): Promise<string> {
        return await this.page.title();
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

    /**
     * Assert favicon URL matches expected
     */
    async assertFaviconUrl(expectedUrl: string): Promise<void> {
        const actualUrl = await this.getFaviconUrl();
        expect(actualUrl).toBe(expectedUrl);
    }

    /**
     * Restore original favicon
     */
    async restoreFavicon(): Promise<void> {
        await this.openFaviconPicker();
        await this.extensionFrame().getByTestId(EMOJI_REMOVE_BUTTON_ID).click();
    }

    /**
     * Restore original title
     */
    async restoreTitle(): Promise<void> {
        await this.openRenameDialog();
        const titleBox = this.extensionFrame().getByTestId(INPUT_BOX_ID);
        await titleBox.clear();
        await this.submitRenameDialog();
    }

    // =================== Tab Management ===================
    
    /**
     * Set tab signature (title + favicon)
     */
    async setSignature(title: string, favicon: string): Promise<void> {
        await this.renameTab(title);
        await this.setFavicon(favicon);
    }

    /**
     * Close and reopen current tab
     */
    async closeAndReopenCurrentTab(): Promise<Page> {
        await this.page.pause();
        const currentUrl = this.page.url();
        await this.page.close();
        const newPage = await this.page.context().newPage();
        await newPage.goto(currentUrl);
        this.page = newPage;
        return newPage;
    }

    /**
     * Open new tab to URL
     */
    async openTabToURL(url: string): Promise<void> {
        const newPage = await this.page.context().newPage();
        await newPage.goto(url);
        // Switch to the new page
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
        return this.page.locator('iframe').contentFrame()
    }

    async waitForPageLoad(): Promise<void> {
        await this.page.waitForLoadState('networkidle');
    }

    async closeWelcomeTab(): Promise<void> {
        try {
            await this.page.evaluate((command) => {
                document.dispatchEvent(new MessageEvent(command));
            }, COMMAND_CLOSE_WELCOME_TAB);
        } catch (error) {
            // Welcome tab might not exist, ignore error
        }
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
        await this.page.goto('chrome://extensions/');
        // Additional logic to navigate to extension settings would go here
    }

    async switchToNewTabAfterPerforming(action: () => Promise<void>): Promise<void> {
        const currentPage = this.page;
        await action();
        const pages = this.page.context().pages();
        const newPage = pages.find(p => p !== currentPage);
        if (newPage) {
            this.page = newPage;
        }
    }

    /**
     * Simulate browser restart by closing current context and creating a new one
     * with the same user data directory. This preserves chrome.storage data.
     * Returns a new ExtensionUtils instance for the restarted browser.
     */
    static async simulateBrowserRestart(currentContext: any, userDataDir: string): Promise<ExtensionUtils> {
        const { chromium } = await import('@playwright/test');
        
        const pathToExtension = path.join(appRootPath.path, 'dist/dev');
        
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
