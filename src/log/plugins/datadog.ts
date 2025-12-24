import log from 'loglevel';
import { datadogLogs } from '@datadog/browser-logs';
import { inProduction, isServiceWorker } from '../utils';

let datadogInitialized = false;

const methodLevels: Record<string, number> = {
    'trace': log.levels.TRACE,
    'debug': log.levels.DEBUG,
    'log': log.levels.DEBUG,
    'info': log.levels.INFO,
    'warn': log.levels.WARN,
    'error': log.levels.ERROR
};

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
        env: 'development',
        service: 'tab-renamer',
        allowedTrackingOrigins: [() => true],
        silentMultipleInit: true,
        beforeSend: (event) => {
            event.ddtags = 'component:contentscript';
            return true;
        }
    });

    datadogInitialized = true;
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
        ddtags: 'component:background, env:development',
        message: `${message}`,
        logger: loggerName,
        status: methodName,
        service: 'tab-renamer'
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
        return;
    }

    const logMessage = `${message}`;
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

export function datadogPlugin(logger: log.Logger): void {
    if (process.env.LOG_TO_DD !== "true") {
        return;
    }

    const isInServiceWorker = isServiceWorker();

    if (!isInServiceWorker) {
        initializeDatadogBrowserLogs();
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

                if (isInServiceWorker) {
                    void forwardToDatadog(methodName, loggerNameStr, concatenatedMessage);
                } else {
                    forwardToBrowserDatadog(methodName, loggerNameStr, concatenatedMessage);
                }
            }
        };
    };

    logger.setLevel(logger.getLevel());
}

