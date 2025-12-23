import log, { LogLevelDesc } from 'loglevel';
import { datadogLogs } from '@datadog/browser-logs';
import { inProduction } from './config';

// Type declaration for service worker detection
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const ServiceWorkerGlobalScope: any;

let datadogInitialized = false;

function initializeDatadogBrowserLogs(): void {
    if (datadogInitialized || inProduction()) {
        return;
    }

    const ddClientToken = process.env.DD_CLIENT_TOKEN;
    const ddSite = process.env.DD_SITE || 'datadoghq.com';

    if (!ddClientToken) {
        console.warn('[initializeDatadogBrowserLogs] DD_CLIENT_TOKEN not configured - Datadog browser logging disabled');
        return;
    }

    datadogLogs.init({
        clientToken: ddClientToken,
        site: ddSite,
        forwardErrorsToLogs: true,
        sessionSampleRate: 100,
        service: 'tab-renamer',
        env: 'development',
        allowedTrackingOrigins: [() => true],
        silentMultipleInit: true
    });

    datadogInitialized = true;
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
    } catch {
        return false;
    }
}

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

async function forwardToDatadog(methodName: string, loggerName: string, message: string): Promise<void> {
    if (inProduction()) {
        return;
    }

    const ddApiKey = process.env.DD_API_KEY;

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

    try {
        const response = await fetch(`https://http-intake.logs.datadoghq.com/api/v2/logs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': ddApiKey
            },
            body: JSON.stringify(logPayload)
        });

        if (!response.ok) {
            console.error('[forwardToDatadog] Failed to send log to Datadog:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('[forwardToDatadog] Failed to submit log to Datadog:', error);
    }
}

function forwardToBrowserDatadog(methodName: string, loggerName: string, message: string): void {
    if (inProduction() || !datadogInitialized) {
        console.log(`forwardToBrowserDatadog: skipping - in production mode or datadog not initialized`);
        return;
    }

    const logMessage = `#${loggerName}: ${message}`;
    const context = { logger: loggerName };

    switch (methodName) {
        case 'trace':
        case 'debug':
        case 'log':
            datadogLogs.logger.debug(logMessage, context);
            break;
        case 'info':
            datadogLogs.logger.info(logMessage, context);
            break;
        case 'warn':
            datadogLogs.logger.warn(logMessage, context);
            break;
        case 'error':
            datadogLogs.logger.error(logMessage, context);
            break;
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
    
    // Initialize Datadog browser logs if not in service worker
    if (!isInServiceWorker) {
        initializeDatadogBrowserLogs();
    }
    
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

        return function (...messages: unknown[]) {
            const timestamp = formatTimestamp();
            const firstMessage = messages[0];
            const restArgs = messages.slice(1);
            
            // Convert loggerName to string for safe usage
            const loggerNameStr = String(loggerName);
            
            const formattedFirstMessage = `[${timestamp}] #${loggerNameStr}: ${String(firstMessage)}`;
            rawMethod(formattedFirstMessage, ...restArgs);
            const concatenatedMessage = messages.map(msg => 
                typeof msg === 'object' && msg !== null ? JSON.stringify(msg) : String(msg)
            ).join('\n');

            if (isInServiceWorker && methodLevels[methodName] >= logger.getLevel()) {
                void forwardLogToContentScript(methodName, loggerNameStr, concatenatedMessage, []);
            }

            if (methodLevels[methodName] >= logger.getLevel()) {
                if (isInServiceWorker) {
                    void forwardToDatadog(methodName, loggerNameStr, concatenatedMessage);
                } else {
                    forwardToBrowserDatadog(methodName, loggerNameStr, concatenatedMessage);
                }
            }
        };
    };
    logger.setLevel(logger.getLevel());

    return logger;
}

export default log;

