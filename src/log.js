import log from 'loglevel';

if (typeof WEBPACK_MODE !== 'undefined' && WEBPACK_MODE === 'production') {
    log.setLevel('ERROR');
} else {
    // To debug, set the log level to 'DEBUG'. Otherwise set to 'WARN'.
    log.setLevel('WARN');
    // log.setLevel('DEBUG');
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
export function getLogger(name, level) {
    const logger = log.getLogger(name);
    logger.setLevel(level || log.getLevel());

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
