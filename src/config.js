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

export const COMMAND_OPEN_RENAME_DIALOG = `open_rename_dialog`;


// Favicon restoration strategy:
export const FAVICON_RESTORE_STRATEGY = Object.freeze({
    FETCH_SEPARATELY: 'fetch_separately',
    MUTATION_OBSERVER: 'mutation_observer'
});

export const faviconRestorationStrategy = FAVICON_RESTORE_STRATEGY.MUTATION_OBSERVER;