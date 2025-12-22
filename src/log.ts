import log, { LogLevelDesc } from 'loglevel';
import { inProduction } from './config';
import { client, v2 } from "@datadog/datadog-api-client";

let apiInstance: v2.LogsApi | null = null;

if (inProduction()) {
    log.setLevel('ERROR');
} else {
    log.setLevel('DEBUG');
    apiInstance = new v2.LogsApi(client.createConfiguration());
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
    if (inProduction()) {
        return;
    }

    const params: v2.LogsApiSubmitLogRequest = {
        body: [
          {
            ddsource: "nginx",
            ddtags: "env:staging,version:5.1",
            hostname: "i-012345678",
            message: `#${loggerName}: ${message}`,
            service: "payment",
          },
        ],
        contentEncoding: "deflate",
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = await apiInstance!.submitLog(params);
      console.log("DataDog API called successfully. Returned data: " + JSON.stringify(data))
    //   apiInstance
    //     .submitLog(params)
    //     .then((data: any) => {
    //       console.log(
    //         "API called successfully. Returned data: " + JSON.stringify(data)
    //       );
    //     })
    //     .catch((error: any) => console.error(error));

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

            if (isInServiceWorker && methodLevels[logLevel] >= logger.getLevel()) {
                void forwardLogToContentScript(methodName, loggerName, firstMessage, restArgs);
            }

            if (methodLevels[logLevel] >= logger.getLevel()) {
                void forwardToDatadog(methodName, loggerName, message);
            }
        };
    };
    logger.setLevel(logger.getLevel());

    return logger;
}

export default log;

