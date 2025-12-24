import log from 'loglevel';
import { formatTimestamp } from '../utils';

export function prefixPlugin(logger: log.Logger): void {
    const originalFactory = logger.methodFactory;

    logger.methodFactory = function (methodName, logLevel, loggerName) {
        const rawMethod = originalFactory(methodName, logLevel, loggerName);
        const loggerNameStr = String(loggerName);

        return function (...messages: unknown[]) {
            const timestamp = formatTimestamp();
            const firstMessage = messages[0];
            const restArgs = messages.slice(1);
            const formattedFirstMessage = `[${timestamp}] #${loggerNameStr}: ${String(firstMessage)}`;
            rawMethod(formattedFirstMessage, ...restArgs);
        };
    };

    logger.setLevel(logger.getLevel());
}

