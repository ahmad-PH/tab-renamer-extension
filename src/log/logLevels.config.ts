import { LogLevelDesc } from 'loglevel';

export const logLevels: Record<string, LogLevelDesc> = {
    'TabRepository': 'warn',
    'background': 'debug',
    'contentScript': 'debug',
    'App': 'debug',
    'Tab': 'debug',
    'Preservers': 'debug',
    'Observer': 'warn',
    'BackgroundScriptAPI': 'warn',
    'utils': 'warn',
    'InitializationContentScript': 'warn',
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
    'titleChangeHandler': 'debug',
    'fixtures': 'info',
};

