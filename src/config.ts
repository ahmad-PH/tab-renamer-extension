const EXTENSION_PREFIX = "tab-renamer-extension";

export const ROOT_ELEMENT_ID = `${EXTENSION_PREFIX}-root`;
export const ROOT_TAG_NAME = `tab-renamer-root`
export const INPUT_BOX_ID = `${EXTENSION_PREFIX}-input-box`;
export const OVERLAY_ID = `${EXTENSION_PREFIX}-overlay`;

export const FAVICON_PICKER_ID = `${EXTENSION_PREFIX}-favicon-picker`;

export const EMOJI_PICKER_ID = `${EXTENSION_PREFIX}-emoji-picker`;
export const EMOJI_PICKER_IMAGE_ID = `${EXTENSION_PREFIX}-emoji-picker-image`;
export const SEARCH_BAR_ID = 'tab-renamer-extension-emoji-search-bar';
export const SEARCH_RESULTS_ID = 'tab-renamer-extension-search-results-div';
export const PICKED_EMOJI_ID = `${EXTENSION_PREFIX}-picked-emoji`;
export const EMOJI_REMOVE_BUTTON_ID = `${EXTENSION_PREFIX}-emoji-remove-button`;
export const ALL_EMOJIS_ID = 'tab-renamer-extension-all-emojis-div';

export const SETTINGS_BUTTON_ID = `${EXTENSION_PREFIX}-settings-button`;
export const SETTING_BUTTON_TEST_STUB_ID = `${EXTENSION_PREFIX}-settings-button-test-stub`;
export const SETTINGS_BUTTON_TRIGGER_AREA_ID = `${EXTENSION_PREFIX}-settings-button-trigger-area`;
export const SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID = `${EXTENSION_PREFIX}-settings-page-emoji-style-select`;

export const COMMAND_OPEN_RENAME_DIALOG = `open_rename_dialog`;
export const COMMAND_DISCARD_TAB = `discard_tab`;
export const COMMAND_CLOSE_WELCOME_TAB = `close_welcome_tab`;
export const COMMAND_SET_EMOJI_STYLE = `set_emoji_style`;
export const COMMAND_MOVE_TAB = `move_tab`;
export const COMMAND_REFRESH_CURRENT_TITLE = `refresh_current_title`;
export const TEST_COMMAND = `__TEST_COMMAND__`;

export const faviconRestorationStrategy: 'fetch_separately' | 'mutation_observer' = 'mutation_observer';

export const SETTINGS_KEY_EMOJI_STYLE = 'settings.emoji_style';

export const determinePlatform = (): 'mac' | 'win' | 'linux' | 'other' => {
    if (typeof navigator !== 'undefined' && (navigator.platform || navigator.userAgent)) {
        let platformString = '';
        
        if (navigator.userAgentData?.platform) {
            platformString = navigator.userAgentData.platform.toLowerCase();
        } else if (navigator.platform) {
            platformString = navigator.platform.toLowerCase();
        } else {
            platformString = navigator.userAgent.toLowerCase();
        }
        
        return platformString.includes('mac') ? 'mac' :
            platformString.includes('win') ? 'win' : 
            platformString.includes('linux') ? 'linux' : 'other';
    } else {
        const platformString = process.platform;
        return platformString === 'darwin' ? 'mac' :
            platformString === 'win32' ? 'win' :
            platformString == 'linux' ? 'linux' : 'other';
    }
}

export const platform = determinePlatform();

export const EMOJI_STYLE_NATIVE = "native";
export const EMOJI_STYLE_TWEMOJI = "twemoji";
export const EMOJI_STYLE_DEFAULT = platform === 'mac' ? EMOJI_STYLE_NATIVE : EMOJI_STYLE_TWEMOJI;

interface CachedConfig {
    EMOJI_STYLE: string;
}

let cachedConfig: CachedConfig = {
    EMOJI_STYLE: EMOJI_STYLE_DEFAULT
}

export const getEmojiStyle = (): string => cachedConfig.EMOJI_STYLE;

export const inProduction = (): boolean => {
    return typeof WEBPACK_MODE !== 'undefined' && WEBPACK_MODE === 'production';
}

if (typeof chrome !== 'undefined' && chrome.storage) {
    (async function initializeEmojiStyleFromStorage() {
        const { settingsRepository } = await import('./repositories/settingsRepository');
        const emojiStyle = await settingsRepository.getEmojiStyle();
        if (emojiStyle) {
            cachedConfig.EMOJI_STYLE = emojiStyle;
        } else {
            cachedConfig.EMOJI_STYLE = EMOJI_STYLE_DEFAULT;
            await settingsRepository.setEmojiStyle(EMOJI_STYLE_DEFAULT);
        }
    })();

    chrome.storage.sync.onChanged.addListener((changes) => {
        if (changes[SETTINGS_KEY_EMOJI_STYLE]) {
            cachedConfig.EMOJI_STYLE = changes[SETTINGS_KEY_EMOJI_STYLE].newValue;
        }
    });
}
