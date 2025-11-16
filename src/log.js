import log from 'loglevel';
import { inProduction } from './config.js';

if (inProduction()) {
    log.setLevel('ERROR');
} else {
    // log.setLevel('WARN');
    log.setLevel('DEBUG');
}

/**
 * Detects if the current context is the service worker (background script)
 * @returns {boolean}
 */
function isServiceWorker() {
    try {
        // eslint-disable-next-line no-undef
        return typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
    } catch (e) {
        return false;
    }
}

/**
 * Forwards a log message from the service worker to content scripts for easier visibility
 * @param {string} level - The log level (trace, debug, log, info, warn, error)
 * @param {string} name - The logger name
 * @param {string} message - The log message
 * @param {Array} args - Additional arguments
 */
async function forwardLogToContentScript(level, name, message, args) {
    if (inProduction()) {
        return; // Only forward logs in development
    }

    try {
        // Get the active tab and send the log message to it
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab) {
            chrome.tabs.sendMessage(activeTab.id, {
                command: '__FORWARD_LOG__',
                level,
                name,
                message,
                args
            }).catch(() => {
                // Silently fail if content script isn't ready or doesn't exist
                // This prevents error spam in the service worker console
            });
        }
    } catch (e) {
        // Silently fail - we don't want logging to break the extension
    }
}

/**
 * Returns a logger with a specified name. The logger's level is set to the default log level,
 * which may vary depending on whether the application is in production or not.
 * Optionally, a specific log level can be passed to override the default level.
 * 
 * In development mode, if running in the service worker, logs will be forwarded to the active
 * tab's content script for easier visibility in the page console.
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
    const isInServiceWorker = isServiceWorker();

    methods.forEach(method => {
        const originalMethod = logger[method];

        logger[method] = function (message, ...args) {
            // Always log to the original console (service worker console or page console)
            originalMethod.call(logger, `#${name}: ${message}`, ...args);

            // If we're in the service worker, also forward to content scripts
            if (isInServiceWorker) {
                forwardLogToContentScript(method, name, message, args);
            }
        };
    });

    return logger;
}

export default log;
