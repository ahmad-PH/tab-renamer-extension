import { Favicon } from "../favicon";
import { getLogger } from "../log";
import { TabSignature, FaviconDTO } from "../types";
import bgScriptApi from "../backgroundScriptApi";
import FaviconRetriever from "./faviconRetriever";
import { faviconRestorationStrategy } from "../config";
import { getAllTabs } from "../utils";

export const faviconLinksCSSQuery = "html > head link[rel~='icon']";

const log = getLogger('Tab', 'debug');
const plog = getLogger('Preservers', 'debug');
const olog = getLogger('Observer', 'warn');

export class Tab { 
    static instanceExists = false;
    signature: TabSignature | null = null;
    titleMutationObserver: MutationObserver | null = null;
    faviconRetriever: FaviconRetriever;
    injectedFaviconLinkElement: HTMLLinkElement | null = null;
    removedFaviconLinkElements: HTMLLinkElement[] | null = null;
    private _originalTitle: string | null = null;

    constructor() {
        if (Tab.instanceExists) {
            throw new Error('Tab instance already exists, should only be instantiated once.');
        }
        Tab.instanceExists = true;
        this.faviconRetriever = new FaviconRetriever();
    }

    get originalTitle(): string | null {
        log.debug('[GET] originalTitle:', this._originalTitle);
        return this._originalTitle;
    }

    set originalTitle(value: string | null) {
        const oldValue = this._originalTitle;
        log.debug('[SET] originalTitle changing from:', oldValue, 'to:', value);
        
        const stack = new Error().stack;
        log.debug('originalTitle modification stack trace:\n', stack);
    
        this._originalTitle = value;
    }

    async initializeForMainContentScript(): Promise<void> {
        deepDebugging();

        log.debug('initializeForMainContentScript called');
        const signature = await bgScriptApi.loadSignature(true);
        log.debug('These are all signatures:', await getAllTabs());

        log.debug('retrieved signature:', signature);
        log.debug('document.title:', document.title, 'faviconUrl:', await bgScriptApi.getFaviconUrl());
        log.debug('Current ID:', (await bgScriptApi.getTabInfo()));

        if (signature) {
            log.debug('signature found, setting it.');
            await this.setSignature(signature.title, signature.favicon, true, false);
        } else {
            log.debug('signature not found');
            await this.setSignature(null, null, false, false);
        }

        this.originalTitle = await bgScriptApi.unstashOriginalTitle();
        log.debug('unstashed original title:', this.originalTitle);
    }

    async setSignature(title: string | null, favicon: FaviconDTO | null, preserve: boolean = true, save: boolean = true): Promise<void> {
        log.debug('setSignature called with signature:', title, favicon);
        if (title) {
            this._setTitle(title, preserve);
        } else {
            this._restoreTitle();
        }

        if (favicon) {
            this._setFavicon(Favicon.fromDTO(favicon).getUrl(), preserve);
        } else {
            await this._restoreFavicon();
        }

        if (this.signature) {
            this.signature.title = title;
            this.signature.favicon = favicon;
        } else {
            this.signature = new TabSignature(title, favicon);
        }

        if (save) {
            await bgScriptApi.saveSignature(this.signature);
        }
    }

    preFetchOriginalFavicon(): void {
        this.faviconRetriever.preFetchFaviconLinks(document.URL);
    }

    _setTitle(newTabTitle: string, preserve: boolean = true): void {
        log.debug('setDocumentTitle called with newTabTitle:', newTabTitle, preserve);
        if (preserve) {
            this._preserveTabTitle(newTabTitle);
        }
        document.title = newTabTitle;
    }

    _setFavicon(faviconUrl: string, preserve: boolean = true): void {
        if (faviconRestorationStrategy === 'fetch_separately') {
            log.debug('setDocumentFavicon called with faviconUrl:', 
                faviconUrl ? faviconUrl.substring(0, 15) : faviconUrl, preserve);
            if (preserve) {
                this._preserveFavicon(faviconUrl);
            }
            let faviconLinks = document.querySelectorAll(faviconLinksCSSQuery);
        
            faviconLinks.forEach(link => {
                link.parentNode!.removeChild(link);
            });
        
            const link = this._createFaviconLinkElement(faviconUrl);
            document.getElementsByTagName('head')[0].appendChild(link);
            this.injectedFaviconLinkElement = link;

        } else if (faviconRestorationStrategy === 'mutation_observer') {
            log.debug('setDocumentFavicon called with faviconUrl:', 
                faviconUrl ? faviconUrl.substring(0, 15) : faviconUrl, preserve);
            if (preserve) {
                this._preserveFavicon(faviconUrl);
            }
            let faviconLinks = document.querySelectorAll(faviconLinksCSSQuery);
        
            faviconLinks.forEach(link => {
                link.parentNode!.removeChild(link);
            });

            this.removedFaviconLinkElements = Array.from(faviconLinks) as HTMLLinkElement[];
            log.debug('removed faviconLinks:', this.removedFaviconLinkElements.map(link => link.outerHTML));
        
            const link = this._createFaviconLinkElement(faviconUrl);
            document.getElementsByTagName('head')[0].appendChild(link);
            this.injectedFaviconLinkElement = link;
        }
    }

    _createFaviconLinkElement(faviconUrl: string): HTMLLinkElement {
        const link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'icon';
        link.href = faviconUrl;
        return link;
    }

    _restoreTitle(): void {
        log.debug('restoreDocumentTitle called. Current signature', this.signature);
        this.disconnectTabTitlePreserver();
        if (this.signature && this.signature.title && this.originalTitle !== document.title) {
            this._setTitle(this.originalTitle, false);
        }
    }
    
    async _restoreFavicon(): Promise<void> {
        log.debug('restoreFavicon called. Current signature', this.signature);

        if (faviconRestorationStrategy === 'fetch_separately') {
            this.disconnectFaviconPreserver();
            if (this.signature && this.signature.favicon) {
                log.debug('Favicon has been modified.');
                let faviconLinks = await this.faviconRetriever.getFaviconLinks(document.URL);
                log.debug('retrieved faviconLinks:', faviconLinks.map(link => link.outerHTML));
                if (faviconLinks.length === 0) {
                    faviconLinks = [this._createFaviconLinkElement(new URL('/favicon.ico', document.URL).toString())];
                    log.debug('No favicon links found, using default /favicon.ico:', faviconLinks.map(link => link.outerHTML));
                }

                const head = document.getElementsByTagName('head')[0];
                head.removeChild(this.injectedFaviconLinkElement!);
                this.injectedFaviconLinkElement = null;
                
                head.append(...faviconLinks);
            }
        } else if (faviconRestorationStrategy === 'mutation_observer') {
            this.disconnectFaviconPreserver();

            if (this.signature && this.signature.favicon) {
                log.debug('Favicon has been modified.');
                let faviconLinksToRestore = this.removedFaviconLinkElements!;
                log.debug('favicon links to restore:', faviconLinksToRestore.map(link => link.outerHTML));
                if (this.removedFaviconLinkElements!.length === 0) {
                    faviconLinksToRestore = [this._createFaviconLinkElement(new URL('/favicon.ico', document.URL).toString())];
                    log.debug('No favicon links found, using default /favicon.ico:', faviconLinksToRestore.map(link => link.outerHTML));
                }

                const head = document.getElementsByTagName('head')[0];
                head.removeChild(this.injectedFaviconLinkElement!);
                this.injectedFaviconLinkElement = null;
                
                head.append(...faviconLinksToRestore);
            }
        }
    }

    _preserveTabTitle(desiredTitle: string): void {
        plog.debug('preserveTabTitle called with desiredTitle:', desiredTitle);
        this.disconnectTabTitlePreserver();
        this.titleMutationObserver = new MutationObserver((mutations) => {
            plog.debug('titleMutationObserver callback called', mutations);
            mutations.forEach((mutation) => {
                if (mutation.target.nodeName === 'TITLE') {
                    const newTitle = document.title;
                    plog.debug('TITLE mutation detected', newTitle, 'while desriedTitle is:', desiredTitle);
                    if (newTitle !== desiredTitle) {
                        document.title = desiredTitle;
                        this.originalTitle = newTitle;
                    }
                }
            });
        });

        const titleElement = document.querySelector('head > title');
        plog.debug('titleElement:', titleElement);
        if (titleElement) {
            this.titleMutationObserver.observe(titleElement, { subtree: true, characterData: true, childList: true });
        }
    }

    disconnectTabTitlePreserver(): void {
        if (this.titleMutationObserver) {
            this.titleMutationObserver.disconnect();
        }
    }

    _preserveFavicon(_faviconUrl: string): void {
        // empty
    }
    
    disconnectFaviconPreserver(): void {
        // empty
    }
}

const tab = new Tab();
export default tab;

function deepDebugging(): void {
    let faviconMutationObserver = new MutationObserver((mutations) => {
        olog.debug('faviconMutationObserver callback called', mutations);
        let changes: {
            addedNodes: string[];
            removedNodes: string[];
            directChanges: Array<{ attributeName: string | null; oldValue: string | null; newValue: string | null }>;
        } = {
            addedNodes: [],
            removedNodes: [],
            directChanges: []
        };
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.target === document.head) {
                (['addedNodes', 'removedNodes'] as const).forEach((nodeType) => {
                    mutation[nodeType].forEach((node) => {
                        if (node.nodeName === 'LINK' && (node as HTMLLinkElement).rel.includes('icon')) {
                            changes[nodeType].push((node as HTMLLinkElement).outerHTML);
                        }
                    });
                });
            }
        
            const target = mutation.target;
            if (target instanceof HTMLLinkElement) {
                if (target.nodeName === 'LINK' && target.rel.includes('icon')) {
                    const attributeName = mutation.attributeName;
                    const oldValue = mutation.oldValue;
                    const newValue = target.getAttribute(attributeName);
                    changes.directChanges.push({
                        attributeName: attributeName,
                        oldValue: oldValue,
                        newValue: newValue
                    });
                }
            }
        });

        if (changes.addedNodes.length > 0 || changes.removedNodes.length > 0 || changes.directChanges.length > 0) {
            olog.debug('Changes to favicon elements:', changes);
        } else {
            olog.debug('No changes to favicon elements');
        }
    });

    const headElement = document.querySelector('head');
    if (headElement) {
        faviconMutationObserver.observe(headElement, { subtree: true, childList: true, attributes: true });
    }
}

