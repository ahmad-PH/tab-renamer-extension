import log from "../log";

interface DOMListener {
    element: EventTarget;
    type: string;
    handler: EventListener;
}

interface ChromeListener {
    listenerContext: any;
    handler: Function;
}

class ListenerManager {
    domListeners: DOMListener[] = [];
    chromeListeners: ChromeListener[] = [];

    addDOMListener(element: EventTarget, type: string, handler: EventListener): void {
        if (!element) {
            log.debug('found null element in addDOMListener', element, type, handler);
            log.debug(new Error().stack);
        }
        element.addEventListener(type, handler);
        this.domListeners.push({ element, type, handler });
    }

    addChromeListener(listenerContext: any, handler: Function): void {
        listenerContext.addListener(handler);
        this.chromeListeners.push({listenerContext, handler});
    }

    removeAllListeners(): void {
        this.domListeners = [];

        for (const {listenerContext, handler} of this.chromeListeners) {
            listenerContext.removeListener(handler);
        }
        this.chromeListeners = [];
    }
}

const listenerManager = new ListenerManager();

export default listenerManager;

