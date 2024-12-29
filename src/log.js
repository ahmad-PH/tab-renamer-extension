import log from 'loglevel';
import { inProduction } from './config.js';

if (inProduction()) {
    log.setLevel('ERROR');
} else {
    // log.setLevel('WARN');
    log.setLevel('DEBUG');
}

/**
 * Returns a logger with a specified name. The logger's level is set to the default log level,
 * which may vary depending on whether the application is in production or not.
 * Optionally, a specific log level can be passed to override the default level.
 * 
 * @param {string} name 
 * @param {log.LogLevelDesc} [level]
 * @returns {log.Logger}
 */
export function getLogger(name, level = log.getLevel()) {
    const logger = log.getLogger(name);
    if (inProduction()) {
        logger.setLevel('ERROR');
    } else {
        logger.setLevel(level);
    }

    const methods = ['trace', 'debug', 'log', 'info', 'warn', 'error'];

    methods.forEach(method => {
        const originalMethod = logger[method];

        logger[method] = function (message, ...args) {
            originalMethod.call(logger, `#${name}: ${message}`, ...args);
        };
    });

    return logger;
}

export default log;
