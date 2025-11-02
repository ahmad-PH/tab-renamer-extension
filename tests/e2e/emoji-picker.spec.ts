import { test, expect } from './fixtures';
import { ExtensionUtils } from './extensionUtils';
import testData from './testData';
import { 
    EMOJI_STYLE_NATIVE, 
    EMOJI_STYLE_TWEMOJI, 
    COMMAND_SET_EMOJI_STYLE,
    SEARCH_BAR_ID,
    SEARCH_RESULTS_ID,
    PICKED_EMOJI_ID,
    FAVICON_PICKER_ID,
    INPUT_BOX_ID
} from '../../src/config.js';

test.describe('Emoji Picker', () => {
    let extensionUtils: ExtensionUtils;

    test.beforeEach(async ({ page }) => {
        extensionUtils = new ExtensionUtils(page);
        await page.goto(testData.websites[0].url);
        await extensionUtils.closeWelcomeTab();
    });

    const emojiStyles = [EMOJI_STYLE_NATIVE, EMOJI_STYLE_TWEMOJI];
    
    for (const emojiStyle of emojiStyles) {
        test.describe(`with emoji style: ${emojiStyle}`, () => {
            test.beforeEach(async ({ page }) => {
                // Set emoji style before each test
                await page.evaluate(({ command, style }) => {
                    document.dispatchEvent(new MessageEvent(command, { 
                        data: { style } 
                    }));
                }, { command: COMMAND_SET_EMOJI_STYLE, style: emojiStyle });
            });

            test('Can set emojis', async ({ page }) => {
                await extensionUtils.setFavicon('😇');
                
                // Check if favicon is an emoji (data URL)
                await page.waitForTimeout(100);
                await extensionUtils.assertFaviconIsEmoji(emojiStyle);
            });

            test('Emojis not on page before emoji picker being clicked', async ({ page }) => {
                await extensionUtils.openRenameDialog();
                
                // Check that emojis are not visible on the page before opening emoji picker
                // Using XPath equivalent: check if any element contains the emoji text
                const emojiElements = await extensionUtils.extensionFrame().locator('text=😃').count();
                expect(emojiElements).toBe(0);
            });

            test('Emoji picker search bar focused when opened, and returns focus when closed', async ({ page }) => {
                await extensionUtils.openFaviconPicker();
                
                // Check that search bar has focus
                const activeElement = await extensionUtils.getIframeActiveElement();
                expect(activeElement).not.toBeNull();
                
                if (activeElement) {
                    const activeElementId = await activeElement.evaluate((el) => el.id);
                    expect(activeElementId).toBe(SEARCH_BAR_ID);
                }

                // Click favicon picker to close emoji picker
                await extensionUtils.extensionFrame().getByTestId(FAVICON_PICKER_ID).click();
                
                // Check that input box has focus again
                const activeElementAfterClose = await extensionUtils.getIframeActiveElement();
                expect(activeElementAfterClose).not.toBeNull();
                
                if (activeElementAfterClose) {
                    const activeElementIdAfterClose = await activeElementAfterClose.evaluate((el) => el.id);
                    expect(activeElementIdAfterClose).toBe(INPUT_BOX_ID);
                }
            });

            test('Can search for emojis', async ({ page }) => {
                await extensionUtils.openFaviconPicker();

                // Type in search bar
                const searchBar = extensionUtils.extensionFrame().getByTestId(SEARCH_BAR_ID);
                await searchBar.fill('halo');

                // Wait for search results and verify halo emoji is present
                const searchResults = extensionUtils.extensionFrame().getByTestId(SEARCH_RESULTS_ID);
                await searchResults.locator('#😇').waitFor({ state: 'visible', timeout: 10000 });
                
                // Verify that search results contains the halo emoji
                const haloEmojiCount = await searchResults.locator('#😇').count();
                expect(haloEmojiCount).toBe(1);

                // Verify that common emojis are not present in search results
                const commonEmojis = ['😂', '😍', '😭', '😊', '😒', '😘', '😩', '😔', '😏', '😁'];
                for (const emoji of commonEmojis) {
                    const emojiCount = await searchResults.locator(`#${emoji}`).count();
                    expect(emojiCount).toBe(0);
                }

                // Click the halo emoji
                await searchResults.locator('#😇').click();

                // Verify that the picked emoji is set correctly
                const pickedEmojiElement = extensionUtils.extensionFrame().getByTestId(PICKED_EMOJI_ID);
                const dataEmoji = await pickedEmojiElement.getAttribute('data-emoji');
                expect(dataEmoji).toBe('😇');
            });
        });
    }
});
