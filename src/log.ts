import log from 'loglevel';
import { inProduction } from './config';

if (inProduction()) {
    log.setLevel('ERROR');
} else {
    log.setLevel('DEBUG');
}

function formatTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
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

    const isInServiceWorker = isServiceWorker();
    
    const methodLevels: Record<string, number> = {
        'trace': log.levels.TRACE,
        'debug': log.levels.DEBUG,
        'log': log.levels.DEBUG,
        'info': log.levels.INFO,
        'warn': log.levels.WARN,
        'error': log.levels.ERROR
    };

    const originalFactory = logger.methodFactory;
    logger.methodFactory = function (methodName, logLevel, loggerName) {
        const rawMethod = originalFactory(methodName, logLevel, loggerName);

        return function (...messages: any[]) {
            const timestamp = formatTimestamp();
            const firstMessage = messages[0];
            const restArgs = messages.slice(1);
            
            // Add timestamp prefix to the first message
            const formattedFirstMessage = `[${timestamp}] #${name}: ${firstMessage}`;
            rawMethod(formattedFirstMessage, ...restArgs);

            if (isInServiceWorker && methodLevels[methodName] >= logger.getLevel()) {
                forwardLogToContentScript(methodName, name, firstMessage, restArgs);
            }
        };
    };
    logger.setLevel(logger.getLevel());

    return logger;
}

export default log;

