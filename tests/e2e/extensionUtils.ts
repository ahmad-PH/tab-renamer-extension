import { Page, Locator, expect, FrameLocator, ElementHandle } from '@playwright/test';
/* eslint-disable @typescript-eslint/no-unused-vars */
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
    COMMAND_MOVE_TAB,
    OVERLAY_ID,
    SEARCH_BAR_ID,
    SEARCH_RESULTS_ID,
    SETTINGS_BUTTON_ID,
    SETTINGS_BUTTON_TRIGGER_AREA_ID,
    getEmojiStyle,
    TEST_COMMAND,
} from '../../src/config';
/* eslint-enable @typescript-eslint/no-unused-vars */

import { getLogger } from '../../src/log';
import { getDebugAwareTimeout } from './utils.js';

export const faviconLinksCSSQuery = "html > head link[rel~='icon']";
const logger = getLogger('extensionUtils');

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
        await this.page.evaluate((eventType) => {
            document.dispatchEvent(new CustomEvent(eventType));
        }, COMMAND_OPEN_RENAME_DIALOG);

        await this.page.getByTestId(ROOT_ELEMENT_ID).waitFor({state: "attached"});
    }

    async submitRenameDialog(): Promise<void> {
        const renameBox = this.extensionFrame().getByTestId(INPUT_BOX_ID);
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
            const exactMatch = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
            if (exactMatch) return exactMatch.href;
            
            const substringMatch = document.querySelector('link[rel*="icon"]') as HTMLLinkElement;
            return substringMatch ? substringMatch.href : '';
        });
    }

    async assertFaviconIsEmoji(emojiStyle?: string) {
        await expect.poll(() => this.faviconIsEmoji(emojiStyle), {timeout: getDebugAwareTimeout(5_000)}).toBe(true);
    }

    async faviconIsEmoji(emojiStyle?: string): Promise<boolean> {
        emojiStyle = emojiStyle ?? getEmojiStyle();
        
        // Fetch the three attributes that determine correctness:
        const faviconElement = this.getFaviconElement();
        const relAttribute = await faviconElement.getAttribute("rel");
        const hrefAttribute = await faviconElement.getAttribute("href");
        const typeAttribute = await faviconElement.getAttribute("type");
        
        const relContainsIcon = relAttribute?.includes("icon") || false;
        
        let hrefIsCorrect: boolean;
        if (emojiStyle == EMOJI_STYLE_NATIVE) {
            hrefIsCorrect = hrefAttribute?.startsWith("data:image/png;base64,") || false;
        } else if (emojiStyle == EMOJI_STYLE_TWEMOJI) {
            hrefIsCorrect = hrefAttribute?.startsWith("https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/") || false;
        } else {
            throw new Error(`Invalid emoji style: ${emojiStyle}`);
        }

        const typeMatchesIcon = typeAttribute === 'image/x-icon';
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
        await newPage.waitForTimeout(500); // Time for old signature to be marked as closed, so it is ready to load.
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
            await this.dispatchTestCommand(COMMAND_CLOSE_WELCOME_TAB);
        } catch (error) {
            console.error('Error closing welcome tab:', error);
            // Welcome tab might not exist, ignore error
        }
    }

    startConsoleMonitoring() {
        this.page.on('console', msg => {
            if (msg.type() === 'error' || msg.type() === 'warning') {
                console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
            }
        });
    }

    startNetworkMonitoring() {
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

    async getIframeActiveElement(): Promise<ElementHandle<Node> | null> {
        return (await this.extensionFrame().locator('html').evaluateHandle(() => document.activeElement)).asElement();
    }

    async dispatchTestCommand(command: string, data?: Record<string, unknown>): Promise<void> {
        await this.page.evaluate(({ eventType, command, data }) => {
            document.dispatchEvent(new CustomEvent(eventType, { 
                detail: { command, ...data } 
            }));
        }, { eventType: TEST_COMMAND, command, data });
    }

    async scheduleDiscardTabEvent(): Promise<void> {
        await this.dispatchTestCommand(COMMAND_DISCARD_TAB);
    }

    async setEmojiStyle(style: string): Promise<void> {
        await this.dispatchTestCommand(COMMAND_SET_EMOJI_STYLE, { style });
    }

    async openSettingsPage(): Promise<void> {
        await this.extensionFrame().getByTestId(SETTING_BUTTON_TEST_STUB_ID).click({ force: true, timeout: getDebugAwareTimeout(1_500) });
    }

    async switchToNewTabAfterPerforming(action: () => Promise<void>): Promise<Page> {
        const newPagePromise = this.page.context().waitForEvent('page');
        await action();
        return await newPagePromise;
    }

    async moveTabToIndex(index: number): Promise<void> {
        await this.dispatchTestCommand(COMMAND_MOVE_TAB, { index });
    }
}
