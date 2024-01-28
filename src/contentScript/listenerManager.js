import log from "../log";

class ListenerManager {
    constructor() {
        this.domListeners = [];
        this.chromeListeners = [];
    }

    addDOMListener(element, type, handler) {
        if (!element) {
            log.debug('found null element in addDOMListener', element, type, handler);
            log.debug(new Error().stack);
        }
        element.addEventListener(type, handler);
        this.domListeners.push({ element, type, handler });
    }

    addChromeListener(listenerContext, handler) {
        listenerContext.addListener(handler);
        this.chromeListeners.push({listenerContext, handler});
    }

    removeAllListeners() {
        // for (const { element, type, handler } of this.domListeners) {
        //     element.removeEventListener(type, handler);
        // }
        this.domListeners = [];

        for (const {listenerContext, handler} of this.chromeListeners) {
            listenerContext.removeListener(handler);
        }
        this.chromeListeners = [];
    }
}

const listenerManager = new ListenerManager();

export default listenerManager;

