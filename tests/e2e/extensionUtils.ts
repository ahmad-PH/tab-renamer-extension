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

export const faviconLinksCSSQuery = "html > head link[rel~='icon']";

/**
 * Playwright equivalent of DriverUtils for Chrome extension testing
 */
export class ExtensionUtils {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // =================== Dialog Operations ===================
    
    /**
     * Open rename dialog
     */
    async openRenameDialog(): Promise<void> {
        // Dispatch the command to open the dialog
        await this.page.evaluate((command) => {
            document.dispatchEvent(new MessageEvent(command));
        }, COMMAND_OPEN_RENAME_DIALOG);

        // Wait for dialog to be visible
        await expect(this.page.getByTestId(ROOT_ELEMENT_ID)).toBeAttached();
    }

    async submitRenameDialog(): Promise<void> {
        await this.page.keyboard.press('Enter');
    }

    async closeRenameDialog(): Promise<void> {
        await this.page.keyboard.press('Escape');
    }

    // =================== Tab Operations ===================
    
    /**
     * Rename tab with new title
     */
    async renameTab(newTabTitle: string): Promise<void> {
        await this.openRenameDialog();
        const titleBox = this.extensionFrame().getByTestId(INPUT_BOX_ID);
        await titleBox.clear();
        await titleBox.fill(newTabTitle);
        await this.submitRenameDialog();
    }

    /**
     * Get current tab title
     */
    async getTitle(): Promise<string> {
        return await this.page.title();
    }

    /**
     * Get title from UI (within the dialog)
     */
    async getTitleInUI(): Promise<string> {
        const titleBox = this.extensionFrame().getByTestId(INPUT_BOX_ID);
        return await titleBox.inputValue();
    }

    // =================== Favicon Operations ===================
    
    /**
     * Open favicon picker
     */
    async openFaviconPicker(): Promise<void> {
        await this.openRenameDialog();
        await this.extensionFrame().getByTestId(FAVICON_PICKER_ID).click();
    }

    /**
     * Set favicon to emoji
     */
    async setFavicon(emoji: string): Promise<void> {
        await this.openFaviconPicker();
        const emojiPicker = this.extensionFrame().getByTestId(EMOJI_PICKER_ID);
        await emojiPicker.locator(`#${emoji}`).waitFor({ state: 'visible' });
        await emojiPicker.locator(`#${emoji}`).click();
        await this.submitRenameDialog();
    }

    /**
     * Get favicon from UI
     */
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

    /**
     * Close all tabs
     */
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

    /**
     * Wait for page to load completely
     */
    async waitForPageLoad(): Promise<void> {
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Close welcome tab if it exists
     */
    async closeWelcomeTab(): Promise<void> {
        try {
            await this.page.evaluate((command) => {
                document.dispatchEvent(new MessageEvent(command));
            }, COMMAND_CLOSE_WELCOME_TAB);
        } catch (error) {
            // Welcome tab might not exist, ignore error
        }
    }

    /**
     * Get active element within iframe
     */
    async getIframeActiveElement(): Promise<ElementHandle<any> | null> {
        return (await this.extensionFrame().locator('html').evaluateHandle(() => document.activeElement)).asElement();
    }

    /**
     * Schedule discard tab event
     */
    async scheduleDiscardTabEvent(): Promise<void> {
        await this.page.evaluate((command) => {
            document.dispatchEvent(new MessageEvent(command));
        }, COMMAND_DISCARD_TAB);
    }

    /**
     * Set emoji style
     */
    async setEmojiStyle(style: string): Promise<void> {
        await this.page.evaluate(({ command, style }) => {
            document.dispatchEvent(new MessageEvent(command, { 
                data: { style } 
            }));
        }, { command: COMMAND_SET_EMOJI_STYLE, style });
    }

    /**
     * Open settings page
     */
    async openSettingsPage(): Promise<void> {
        await this.page.goto('chrome://extensions/');
        // Additional logic to navigate to extension settings would go here
    }

    /**
     * Switch to new tab after performing action
     */
    async switchToNewTabAfterPerforming(action: () => Promise<void>): Promise<void> {
        const currentPage = this.page;
        await action();
        const pages = this.page.context().pages();
        const newPage = pages.find(p => p !== currentPage);
        if (newPage) {
            this.page = newPage;
        }
    }
}
