import log, { LogLevelDesc } from 'loglevel';
import { inProduction } from './utils';
import { prefixPlugin } from './plugins/prefix';
import { datadogPlugin } from './plugins/datadog';
import { serviceWorkerForwardPlugin } from './plugins/serviceWorkerForward';
import { logLevels } from './logLevels.config';

function getLogLevel(loggerName: string): LogLevelDesc {
    const normalizedLoggerName = loggerName.toLowerCase();
    
    for (const [configKey, level] of Object.entries(logLevels)) {
        if (configKey.toLowerCase() === normalizedLoggerName) {
            return level;
        }
    }
    
    return 'warn';
}

export function getLogger(loggerName: string, logLevel?: LogLevelDesc): log.Logger {
    const logger = log.getLogger(loggerName);

    const level = inProduction() ? 'ERROR' : (logLevel ?? getLogLevel(loggerName));
    logger.setLevel(level);

    prefixPlugin(logger);
    serviceWorkerForwardPlugin(logger);
    if (!inProduction()) {
        datadogPlugin(logger);
    }

    return logger;
}

export default log;

