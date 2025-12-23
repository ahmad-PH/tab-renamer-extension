import log from 'loglevel';
import { inProduction, isServiceWorker } from '../utils';

const methodLevels: Record<string, number> = {
    'trace': log.levels.TRACE,
    'debug': log.levels.DEBUG,
    'log': log.levels.DEBUG,
    'info': log.levels.INFO,
    'warn': log.levels.WARN,
    'error': log.levels.ERROR
};

async function forwardLogToContentScript(level: string, loggerName: string, message: string, args: unknown[]): Promise<void> {
    if (inProduction()) {
        return;
    }

    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id) {
            chrome.tabs.sendMessage(activeTab.id, {
                command: '__FORWARD_LOG__',
                level,
                name: loggerName,
                message,
                args
            }).catch(() => {
                // Silently fail if content script isn't ready or doesn't exist
            });
        }
    } catch {
        // Silently fail - we don't want logging to break the extension
    }
}

export function serviceWorkerForwardPlugin(logger: log.Logger): void {
    if (!isServiceWorker()) {
        return;
    }

    const originalFactory = logger.methodFactory;

    logger.methodFactory = function (methodName, logLevel, loggerName) {
        const rawMethod = originalFactory(methodName, logLevel, loggerName);
        const loggerNameStr = String(loggerName);

        return function (...messages: unknown[]) {
            rawMethod(...messages);

            if (methodLevels[methodName] >= logger.getLevel()) {
                const concatenatedMessage = messages.map(msg =>
                    typeof msg === 'object' && msg !== null ? JSON.stringify(msg) : String(msg)
                ).join('\n');

                void forwardLogToContentScript(methodName, loggerNameStr, concatenatedMessage, []);
            }
        };
    };

    logger.setLevel(logger.getLevel());
}

