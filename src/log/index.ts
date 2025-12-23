import log, { LogLevelDesc } from 'loglevel';
import { inProduction } from './utils';
import { prefixPlugin } from './plugins/prefix';
import { datadogPlugin } from './plugins/datadog';
import { serviceWorkerForwardPlugin } from './plugins/serviceWorkerForward';

export function getLogger(loggerName: string, level: LogLevelDesc = 'info'): log.Logger {
    const logger = log.getLogger(loggerName);

    if (inProduction()) {
        logger.setLevel('ERROR');
    } else {
        logger.setLevel(level);
    }

    prefixPlugin(logger);
    datadogPlugin(logger);
    serviceWorkerForwardPlugin(logger);

    return logger;
}

export default log;

