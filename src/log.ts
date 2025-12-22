import log, { LogLevelDesc } from 'loglevel';
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

async function forwardLogToContentScript(level: string, loggerName: string, message: string, args: any[]): Promise<void> {
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
    } catch (e) {
        // Silently fail - we don't want logging to break the extension
    }
}

async function forwardToDatadog(methodName: string, loggerName: string, message: string): Promise<void> {
    console.log('[forwardToDatadog] Called with:', { methodName, loggerName, message });
    
    if (inProduction()) {
        console.log('[forwardToDatadog] Skipping - in production mode');
        return;
    }

    const ddApiKey = process.env.DD_API_KEY;
    const ddSite = process.env.DD_SITE || 'datadoghq.com';

    if (!ddApiKey) {
        console.error('[forwardToDatadog] DD_API_KEY not configured - cannot submit log');
        return;
    }

    const logPayload = {
        ddsource: 'browser',
        ddtags: 'env:development',
        service: 'tab-renamer',
        message: `#${loggerName}: ${message}`,
        level: methodName,
        logger: {
            name: loggerName
        }
    };

    console.log('[forwardToDatadog] Submitting log with payload:', JSON.stringify(logPayload, null, 2));
      
    try {
        const response = await fetch(`https://http-intake.logs.datadoghq.com/api/v2/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': ddApiKey
            },
            body: JSON.stringify(logPayload)
        });

        if (response.ok) {
            console.log('[forwardToDatadog] Log successfully sent to Datadog');
        } else {
            console.error('[forwardToDatadog] Failed to send log to Datadog:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('[forwardToDatadog] Failed to submit log to Datadog:', error);
    }
}

export function getLogger(loggerName: string, level: LogLevelDesc = 'info'): log.Logger {
    const logger = log.getLogger(loggerName);
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
            const formattedFirstMessage = `[${timestamp}] #${loggerName}: ${firstMessage}`;
            rawMethod(formattedFirstMessage, ...restArgs);
            const concatenatedMessage = messages.map(msg => 
                typeof msg === 'object' && msg !== null ? JSON.stringify(msg) : String(msg)
            ).join('\n');

            if (isInServiceWorker && methodLevels[methodName] >= logger.getLevel()) {
                void forwardLogToContentScript(methodName, loggerName, concatenatedMessage, []);
            }

            console.log(`Checking whether to call DD: logLevel: ${String(logLevel)}, methodLevels[logLevel]: ${methodLevels[logLevel]}, logger.getLevel(): ${logger.getLevel()}, methodName: ${methodName}, loggerName: ${String(loggerName)}, firstMessage:`, firstMessage)

            if (isInServiceWorker && methodLevels[methodName] >= logger.getLevel()) {
                console.log('[logger.methodFactory] Triggering forwardToDatadog');
                void forwardToDatadog(methodName, loggerName, concatenatedMessage);
            }
        };
    };
    logger.setLevel(logger.getLevel());

    return logger;
}

export default log;

