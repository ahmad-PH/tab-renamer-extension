import log from 'loglevel';

if (typeof WEBPACK_MODE !== 'undefined' && WEBPACK_MODE === 'production') {
    log.setLevel('ERROR');
} else {
    // To debug, set the log level to 'DEBUG'. Otherwise set to 'WARN'.
    log.setLevel('WARN');
    // log.setLevel('DEBUG');
}

/**
 * @param {string} name 
 * @returns {log.Logger}
 */
export function getLogger(name) {
    const logger = log.getLogger(name);
    logger.setLevel(log.getLevel());
    return logger;
}

export default log;
