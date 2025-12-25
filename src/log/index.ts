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

    if (inProduction()) {
        logger.setLevel('ERROR');
    } else {
        if (logLevel != null) {
            logger.setLevel(logLevel);
        } else {
            logger.setLevel(getLogLevel(loggerName))
        }
    }

    prefixPlugin(logger);
    datadogPlugin(logger);
    serviceWorkerForwardPlugin(logger);

    return logger;
}

export default log;

