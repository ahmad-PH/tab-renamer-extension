class ListenerManager {
    constructor() {
        this.domListeners = [];
        this.runtimeListeners = [];
    }

    addDOMListener(element, type, handler) {
        element.addEventListener(type, handler);
        this.domListeners.push({ element, type, handler });
    }

    addRuntimeListener(handler) {
        chrome.runtime.onMessage.addListener(handler);
        this.runtimeListeners.push(handler);
    }

    removeAllListeners() {
        console.log('REMOVE ALL LISTENERS CALLED');
        // for (const { element, type, handler } of this.domListeners) {
        //     element.removeEventListener(type, handler);
        // }
        this.domListeners = [];

        for (const handler of this.runtimeListeners) {
            chrome.runtime.onMessage.removeListener(handler);
        }
        this.runtimeListeners = [];
    }
}

const listenerManager = new ListenerManager();

export default listenerManager;

