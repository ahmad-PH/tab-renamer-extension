import log from 'loglevel';
import { inProduction } from './config';

if (inProduction()) {
    log.setLevel('ERROR');
} else {
    log.setLevel('DEBUG');
}

function isServiceWorker(): boolean {
    try {
        return typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
    } catch (e) {
        return false;
    }
}

async function forwardLogToContentScript(level: string, name: string, message: string, args: any[]): Promise<void> {
    if (inProduction()) {
        return;
    }

    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id) {
            chrome.tabs.sendMessage(activeTab.id, {
                command: '__FORWARD_LOG__',
                level,
                name,
                message,
                args
            }).catch(() => {
                // Silently fail if content script isn't ready or doesn't exist
            });
        }
    } catch (e) {
        // Silently fail - we don't want logging to break the extension
    }
}

export function getLogger(name: string, level: log.LogLevelDesc = log.getLevel()): log.Logger {
    const logger = log.getLogger(name);
    if (inProduction()) {
        logger.setLevel('ERROR');
    } else {
        logger.setLevel(level);
    }

    const methods = ['trace', 'debug', 'log', 'info', 'warn', 'error'] as const;
    const isInServiceWorker = isServiceWorker();
    
    const methodLevels: Record<string, number> = {
        'trace': log.levels.TRACE,
        'debug': log.levels.DEBUG,
        'log': log.levels.DEBUG,
        'info': log.levels.INFO,
        'warn': log.levels.WARN,
        'error': log.levels.ERROR
    };

    methods.forEach(method => {
        const originalMethod = (logger as any)[method];

        (logger as any)[method] = function (message: string, ...args: any[]) {
            originalMethod.call(logger, `#${name}: ${message}`, ...args);

            if (isInServiceWorker && methodLevels[method] >= logger.getLevel()) {
                forwardLogToContentScript(method, name, message, args);
            }
        };
    });

    return logger;
}

export default log;

