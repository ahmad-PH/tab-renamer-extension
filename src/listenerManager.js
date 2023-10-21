class ListenerManager {
    constructor() {
        this.domListeners = [];
        this.chromeListeners = [];
    }

    addDOMListener(element, type, handler) {
        if (!element) {
            console.log('found null element in addDOMListener', element, type, handler);
            console.log(new Error().stack);
        }
        element.addEventListener(type, handler);
        this.domListeners.push({ element, type, handler });
    }

    addChromeListener(listenerContext, handler) {
        listenerContext.addListener(handler);
        this.chromeListeners.push({listenerContext, handler});
    }

    removeAllListeners() {
        console.log('REMOVE ALL LISTENERS CALLED');
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

