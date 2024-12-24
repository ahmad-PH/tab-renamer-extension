import bgScriptApi from "../backgroundScriptApi";
import { EMOJI_STYLE_NATIVE, EMOJI_STYLE_TWEMOJI } from "../config";
import { castType } from "../utils";
import { getLogger } from "../log";

const log = getLogger('settings', 'debug');

document.addEventListener('DOMContentLoaded', async () => {
    const { emojiStyle } = await chrome.storage.sync.get('emojiStyle');
    if (emojiStyle) {
        document.getElementById('emojiStyle').value = emojiStyle;
    }
});

document.getElementById('emojiStyle').addEventListener('change', (event) => {
    const valuesMapUIToBackend = {
        "system": EMOJI_STYLE_NATIVE,
        "twemoji": EMOJI_STYLE_TWEMOJI,
    }
    const selectedStyle = castType(event.target, HTMLSelectElement).value;
    log.debug("Emoji style change listener in settings.js called with value:", selectedStyle);
    bgScriptApi.setEmojiStyle(valuesMapUIToBackend[selectedStyle])
});