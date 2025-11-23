import { platform, storageGet, storageSet } from "./utils";

const EXTENSION_PREFIX = "tab-renamer-extension";

// App:
export const ROOT_ELEMENT_ID = `${EXTENSION_PREFIX}-root`;
export const ROOT_TAG_NAME = `tab-renamer-root`
export const INPUT_BOX_ID = `${EXTENSION_PREFIX}-input-box`;
export const OVERLAY_ID = `${EXTENSION_PREFIX}-overlay`;

// Selected Emoji:
export const FAVICON_PICKER_ID = `${EXTENSION_PREFIX}-favicon-picker`;

// Emoji Picker:
export const EMOJI_PICKER_ID = `${EXTENSION_PREFIX}-emoji-picker`;
export const EMOJI_PICKER_IMAGE_ID = `${EXTENSION_PREFIX}-emoji-picker-image`;
export const SEARCH_BAR_ID = 'tab-renamer-extension-emoji-search-bar';
export const SEARCH_RESULTS_ID = 'tab-renamer-extension-search-results-div';
export const PICKED_EMOJI_ID = `${EXTENSION_PREFIX}-picked-emoji`;
export const EMOJI_REMOVE_BUTTON_ID = `${EXTENSION_PREFIX}-emoji-remove-button`;
export const ALL_EMOJIS_ID = 'tab-renamer-extension-all-emojis-div';

// Settings Button:
export const SETTINGS_BUTTON_ID = `${EXTENSION_PREFIX}-settings-button`;
export const SETTING_BUTTON_TEST_STUB_ID = `${EXTENSION_PREFIX}-settings-button-test-stub`;
export const SETTINGS_BUTTON_TRIGGER_AREA_ID = `${EXTENSION_PREFIX}-settings-button-trigger-area`;
export const SETTINGS_PAGE_EMOJI_STYLE_SELECT_ID = `${EXTENSION_PREFIX}-settings-page-emoji-style-select`;

// Commands:
export const COMMAND_OPEN_RENAME_DIALOG = `open_rename_dialog`;
export const COMMAND_DISCARD_TAB = `discard_tab`;
export const COMMAND_CLOSE_WELCOME_TAB = `close_welcome_tab`;
export const COMMAND_SET_EMOJI_STYLE = `set_emoji_style`;

// Favicon restoration strategy:
// Accepted values: 'fetch_separately', 'mutation_observer'
export const faviconRestorationStrategy = 'mutation_observer';


// Settings keys:
export const SETTINGS_KEY_EMOJI_STYLE = 'settings.emoji_style';

// Emoji style:
export const EMOJI_STYLE_NATIVE = "native";
export const EMOJI_STYLE_TWEMOJI = "twemoji";
// export const EMOJI_STYLE_DEFAULT = platform === 'mac' ? EMOJI_STYLE_NATIVE : EMOJI_STYLE_TWEMOJI;
export const EMOJI_STYLE_DEFAULT = EMOJI_STYLE_TWEMOJI;
let cachedConfig = {
    EMOJI_STYLE: EMOJI_STYLE_DEFAULT
}

export const getEmojiStyle = () => cachedConfig.EMOJI_STYLE;

export const inProduction = () => {
    return typeof WEBPACK_MODE !== 'undefined' && WEBPACK_MODE === 'production';
}

// Keep the in-memory cache in sync with the storage:
if (typeof chrome !== 'undefined' && chrome.storage) {
    console.log('Chrome storage API available, initializing emoji style sync');

    (async function initializeEmojiStyleFromStorage() {
        const emojiStyle = await storageGet(SETTINGS_KEY_EMOJI_STYLE);
        if (emojiStyle) {
            // console.log('Updating cached emoji style from storage:', {
            //     from: cachedConfig.EMOJI_STYLE,
            //     to: emojiStyle
            // });
            cachedConfig.EMOJI_STYLE = emojiStyle;
        } else { // Emoji style not set in storage yet:
            cachedConfig.EMOJI_STYLE = EMOJI_STYLE_DEFAULT;
            await storageSet({ [SETTINGS_KEY_EMOJI_STYLE]: EMOJI_STYLE_DEFAULT });
        }
    })();

    // Listen for changes
    chrome.storage.sync.onChanged.addListener((changes) => {
        if (changes[SETTINGS_KEY_EMOJI_STYLE]) {
            // console.log('Emoji style change detected:', {
            //     oldValue: changes[SETTINGS_KEY_EMOJI_STYLE].oldValue,
            //     newValue: changes[SETTINGS_KEY_EMOJI_STYLE].newValue,
            //     currentCachedValue: cachedConfig.EMOJI_STYLE
            // });
            cachedConfig.EMOJI_STYLE = changes[SETTINGS_KEY_EMOJI_STYLE].newValue;
        }
    });
}
