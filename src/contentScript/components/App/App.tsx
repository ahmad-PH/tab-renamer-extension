import React, { useEffect, useRef, useState, useContext } from 'react';
import styles from './App.module.css';
import { ROOT_ELEMENT_ID, OVERLAY_ID, COMMAND_OPEN_RENAME_DIALOG, faviconRestorationStrategy, inProduction } from '../../../config';
import { getLogger } from "../../../log";
import SelectedFavicon from '../SelectedEmoji';
import FaviconPicker from '../FaviconPicker';
import TitleInputBox from '../TitleInputBox';
import { TabSignature } from '../../../types';
import { Favicon, SystemEmojiFavicon, TwemojiFavicon, UrlFavicon } from '../../../favicon';
import SettingsButton from '../SettingsButton';
import Frame, { FrameContextConsumer } from 'react-frame-component';
import { Tab } from '../../tab';

const log = getLogger('App', 'debug');

export const TabContext = React.createContext<Tab | null>(null);

export default function App() {
    const [isVisible, setIsVisible] = useState(true);
    const [selectedFavicon, setSelectedFavicon] = useState<Favicon | null>(null);
    const [inputBoxValue, setInputBoxValue] = useState('');
    const [emojiPickerIsVisible, setEmojiPickerIsVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [styleElement, setStyleElement] = useState<JSX.Element | null>(null);

    const tab = useContext(TabContext)!;

    if (faviconRestorationStrategy === 'fetch_separately') {
        useEffect(() => {
            if (isVisible) {
                tab.preFetchOriginalFavicon();
            }
        }, [isVisible, tab]);
    }
    useStopKeyEventsPropagation(isVisible, ['Escape', 'Enter']);

    useEffect(() => {
        if (tab.signature.title) {
            setInputBoxValue(tab.signature.title);
        }
        if (tab.signature.favicon) {
            if (![SystemEmojiFavicon.type, TwemojiFavicon.type].includes(tab.signature.favicon.type)) {
                throw new Error('Only supporting emoji favicons at the moment.');
            }
            setSelectedFavicon(Favicon.fromDTO(tab.signature.favicon));
        }
    }, [tab]);

    useEffect(() => {
        function chromeOpenRenameDialogListener(message: any, _sender: any, _sendResponse: any) {
            if (message.command === COMMAND_OPEN_RENAME_DIALOG) {
                setIsVisible(!isVisible);
            }
        }

        chrome.runtime.onMessage.addListener(chromeOpenRenameDialogListener);

        function domOpenRenameDialogListener(_event: Event) {
            setIsVisible(!isVisible);
        }

        if (!inProduction()) {
            document.addEventListener(COMMAND_OPEN_RENAME_DIALOG, domOpenRenameDialogListener);
        }
        
        return () => {
            chrome.runtime.onMessage.removeListener(chromeOpenRenameDialogListener);
            if (!inProduction()) {
                document.removeEventListener(COMMAND_OPEN_RENAME_DIALOG, domOpenRenameDialogListener);
            }
        };
    });

    useDebugOnClick();

    const handleInputBoxKeydown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            log.debug('Enter key pressed', inputBoxValue, selectedFavicon);
            const newDocumentTitle = inputBoxValue === '' ? null : inputBoxValue;
            const newDocumentFavicon = selectedFavicon ? selectedFavicon.toDTO() : null;
            await tab.setSignature(newDocumentTitle, newDocumentFavicon);
            setIsVisible(false);
        }
    };

    const handleSelectedFaviconClick = () => {
        setEmojiPickerIsVisible(!emojiPickerIsVisible);
    }

    const handleFaviconClick = (favicon: Favicon) => {
        setSelectedFavicon(favicon);
        setEmojiPickerIsVisible(false);
    }

    const handleRemoveEmoji = () => {
        setSelectedFavicon(null);
        setEmojiPickerIsVisible(false);
    }

    useEffect(() => {
        if (isVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isVisible]);

    useEffect(() => {
        if (!emojiPickerIsVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [emojiPickerIsVisible]);

    useEffect(() => {
        const tabRenamerRoot = document.querySelector('tab-renamer-root');
        let combinedStyles = '';
        tabRenamerRoot!.shadowRoot!.querySelectorAll('style').forEach((styleElement) => {
            combinedStyles += styleElement.textContent;
        });
        setStyleElement(<style>{combinedStyles}</style>);
    }, []);
    
    return (
        <div id={ROOT_ELEMENT_ID} className={styles.root} style={{ display: isVisible ? 'block' : 'none' }}>
            <Frame
                head={styleElement} 
                className = {styles.mainBarIFrameContainer}
                initialContent={`<!DOCTYPE html><html class="${styles.inputBoxHTML}" data-tab-renamer-frame="true"><head></head><body class="${styles.inputBoxBody}" id="frameMountTarget"></body></html>`}
                mountTarget="#frameMountTarget"
                contentDidMount={() => {
                    if (isVisible) {
                        inputRef.current?.focus();
                    }
                }}
            >
                <FrameContextConsumer>
                    {({document}) => {
                        document.addEventListener('keydown', (event: KeyboardEvent) => {
                            if (event.key === "Escape") {
                                setIsVisible(false);
                            }
                        });
                        return (
                            <>
                                <div id={OVERLAY_ID} className={styles.overlay} onClick={() => {setIsVisible(false)}}/>
                                <div className={styles.mainBarContainer}>
                                    <div className={styles.mainBar}>
                                        <div className={styles.faviconPickerWrapper}>
                                            <SelectedFavicon selectedFavicon={selectedFavicon} handleSelectedFaviconClick={handleSelectedFaviconClick}/>
                                            {emojiPickerIsVisible && 
                                                <FaviconPicker 
                                                    onFaviconClick={handleFaviconClick}
                                                    onRemoveEmoji={handleRemoveEmoji}
                                                />
                                            }
                                        </div>
            
                                        <TitleInputBox
                                            inputBoxValue={inputBoxValue}
                                            setInputBoxValue={setInputBoxValue}
                                            handleInputBoxKeydown={handleInputBoxKeydown}
                                            inputRef={inputRef}
                                        />
                                    </div>
                                </div>
                                <SettingsButton />
                            </>
                        )
                    }}
                    
                </FrameContextConsumer>
            </Frame>
        </div>
    );
}

function useStopKeyEventsPropagation(shouldStopPropagation: boolean, exceptionKeys: string[] = []) {
    useEffect(() => {
        function stopPropagation(event: KeyboardEvent) {
            if (shouldStopPropagation && !exceptionKeys.includes(event.key)) {
                event.stopImmediatePropagation();
            }
        }

        log.debug('useStopKeyEventsPropagation called:', shouldStopPropagation, exceptionKeys);

        if (shouldStopPropagation) {
            document.addEventListener('keydown', stopPropagation, true);
            document.addEventListener('keyup', stopPropagation, true);
        } else {
            document.removeEventListener('keydown', stopPropagation, true);
            document.removeEventListener('keyup', stopPropagation, true);
        }

        return () => {
            document.removeEventListener('keydown', stopPropagation, true);
            document.removeEventListener('keyup', stopPropagation, true);
        };
    }, [shouldStopPropagation, exceptionKeys]);
}

function useDebugOnClick() {
    useEffect(() => {
        const debugFunction = async () => {
            log.debug('storage:', await chrome.storage.sync.get(null));
            chrome.runtime.sendMessage({command: 'test'});
        };
        document.body.addEventListener('click', debugFunction);

        return () => {
            document.body.removeEventListener('click', debugFunction);
        }
    });
}

