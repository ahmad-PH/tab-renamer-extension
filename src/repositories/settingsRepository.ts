import { storageGet, storageSet } from "../utils";
import { SETTINGS_KEY_EMOJI_STYLE } from "../config";
import { getLogger } from "../log";

const log = getLogger('SettingsRepository');

export interface ISettingsRepository {
    getEmojiStyle(): Promise<string>;
    setEmojiStyle(style: string): Promise<void>;
}

class SettingsRepository implements ISettingsRepository {
    async getEmojiStyle(): Promise<string> {
        log.debug('getEmojiStyle called');
        const style = await storageGet(SETTINGS_KEY_EMOJI_STYLE);
        log.debug('retrieved emoji style:', style);
        return style;
    }

    async setEmojiStyle(style: string): Promise<void> {
        log.debug('setEmojiStyle called with style:', style);
        await storageSet({ [SETTINGS_KEY_EMOJI_STYLE]: style });
        log.debug('emoji style saved to storage');
    }
}

export const settingsRepository = new SettingsRepository();

