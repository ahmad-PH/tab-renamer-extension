import React, { useEffect, useRef, useState, useContext } from 'react';
import styles from './App.module.css';
import { ROOT_ELEMENT_ID, INPUT_BOX_ID, OVERLAY_ID, COMMAND_OPEN_RENAME_DIALOG, faviconRestorationStrategy, inProduction } from '../../../config.js';
import PropTypes from 'prop-types';
import { getLogger } from "../../../log";
import SelectedFavicon from '../SelectedEmoji';
import FaviconPicker from '../FaviconPicker';
import { TabSignature } from '../../../types';
import { Favicon, SystemEmojiFavicon, TwemojiFavicon, UrlFavicon } from '../../../favicon';

const log = getLogger('App', 'debug');

export const TabContext = React.createContext(null);

/**
 */
export default function App() {
    const [isVisible, setIsVisible] = useState(true);
    /** @type {[Favicon, React.Dispatch<Favicon>]} */
    const [selectedFavicon, setSelectedFavicon] = useState(null);
    const [inputBoxValue, setInputBoxValue] = useState('');
    const [emojiPickerIsVisible, setEmojiPickerIsVisible] = useState(false);
    const inputRef = useRef(null);


    /** 
     * @typedef {import('../../tab').Tab} Tab
     * @type {Tab} 
     */
    const tab = useContext(TabContext);

    // @ts-ignore
    if (faviconRestorationStrategy === 'fetch_separately') {
        useEffect(() => {
            if (isVisible) {
                tab.preFetchOriginalFavicon();
            }
        }, [isVisible]);
    }

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsVisible(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

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
    }, []);

    useEffect(() => {
        function chromeOpenRenameDialogListener(message, _sender, _sendResponse) {
            if (message.command === COMMAND_OPEN_RENAME_DIALOG) {
                setIsVisible(!isVisible);
            }
        }

        chrome.runtime.onMessage.addListener(chromeOpenRenameDialogListener);

        function domOpenRenameDialogListener(_event) {
            setIsVisible(!isVisible);
        }

        if (!inProduction()) { // Only for testing
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

    const handleInputBoxKeydown = async (event) => {
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

    /**
     * @param {Favicon} favicon 
     */
    const handleFaviconClick = (favicon) => {
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
    
    return (
        <div id={ROOT_ELEMENT_ID} className={styles.root} style={{ display: isVisible ? 'block' : 'none' }}>
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

                    <input
                        type="text"
                        id={INPUT_BOX_ID}
                        className={styles.inputBox}
                        placeholder="New Tab Title"
                        autoComplete="off"
                        value={inputBoxValue}
                        onChange={(event) => setInputBoxValue(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={handleInputBoxKeydown}
                        ref={inputRef}
                    />
                </div>
            </div>
        </div>
    );
}


function useStopKeyEventsPropagation(shouldStopPropagation, exceptionKeys = []) {
    useEffect(() => {
        function stopPropagation(event) {
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
    }, [shouldStopPropagation]);
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
