// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const ServiceWorkerGlobalScope: any;

export { inProduction } from '../config';

export function formatTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export function isServiceWorker(): boolean {
    try {
        return typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope;
    } catch {
        return false;
    }
}

