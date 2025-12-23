import { LogLevelDesc } from 'loglevel';

export const logLevels: Record<string, LogLevelDesc> = {
    'TabRepository': 'warn',
    'contentScript': 'info',
    'App': 'warn',
    'Tab': 'warn',
    'Preservers': 'warn',
    'Observer': 'warn',
    'background': 'debug',
    'BackgroundScriptAPI': 'debug',
    'utils': 'debug',
    'InitializationContentScript': 'debug',
    'Title Observer': 'debug',
    'SettingsRepository': 'warn',
    'settings': 'debug',
    'garbageCollector': 'warn',
    'markAllOpenSignaturesAsClosed': 'warn',
    'SeleniumUITests': 'warn',
    'DriverUtils': 'warn',
    'FaviconRetriever': 'warn',
    'emojiSearch': 'debug',
    'EmojiPicker': 'debug',
    'extensionUtils': 'info',
};

