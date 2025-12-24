import { LogLevelDesc } from 'loglevel';

export const logLevels: Record<string, LogLevelDesc> = {
    'TabRepository': 'debug',
    'background': 'debug',
    'contentScript': 'debug',
    'App': 'warn',
    'Tab': 'warn',
    'Preservers': 'warn',
    'Observer': 'warn',
    'BackgroundScriptAPI': 'warn',
    'utils': 'warn',
    'InitializationContentScript': 'debug',
    'Title Observer': 'warn',
    'SettingsRepository': 'warn',
    'settings': 'warn',
    'garbageCollector': 'warn',
    'markAllOpenSignaturesAsClosed': 'warn',
    'SeleniumUITests': 'warn',
    'DriverUtils': 'warn',
    'FaviconRetriever': 'warn',
    'emojiSearch': 'warn',
    'EmojiPicker': 'warn',
    'extensionUtils': 'warn',
};

