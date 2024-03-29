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

// Commands:
export const COMMAND_OPEN_RENAME_DIALOG = `open_rename_dialog`;
export const COMMAND_DISCARD_TAB = `discard_tab`;
export const COMMAND_CLOSE_WELCOME_TAB = `close_welcome_tab`;


// Favicon restoration strategy:
// Accepted values: 'fetch_separately', 'mutation_observer'
export const faviconRestorationStrategy = 'mutation_observer';



export const inProduction = () => {
    return typeof WEBPACK_MODE !== 'undefined' && WEBPACK_MODE === 'production';
}

