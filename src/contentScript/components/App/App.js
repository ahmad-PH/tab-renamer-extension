import React, { useEffect, useRef, useState, useContext } from 'react';
import styles from './App.module.css';
import { ROOT_ELEMENT_ID, INPUT_BOX_ID, OVERLAY_ID, COMMAND_OPEN_RENAME_DIALOG, faviconRestorationStrategy } from '../../../config';
import PropTypes from 'prop-types';
import { getLogger } from "../../../log";
import SelectedEmoji from '../SelectedEmoji';
import EmojiPicker from '../EmojiPicker';
import { TabSignature } from '../../../types';
import { EmojiFavicon, Favicon, UrlFavicon } from '../../../favicon';

const log = getLogger('App', 'warn');

export const TabContext = React.createContext(null);

/**
 */
export default function App() {
    const [isVisible, setIsVisible] = useState(true);
    const [selectedEmoji, setSelectedEmoji] = useState(null);
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

    useEffect(() => {
        if (tab.signature.title) {
            setInputBoxValue(tab.signature.title);
        }
        if (tab.signature.favicon) {
            if (tab.signature.favicon.type !== EmojiFavicon.type) {
                throw new Error('Only supporting emoji favicons at the moment.');
            }
            setSelectedEmoji(EmojiFavicon.fromDTO(tab.signature.favicon).emoji);
        }
        // const loadInitialData = async () => {
        //     const signature = await bgScriptApi.loadSignature();
        //     log.debug('retrieved signature in loadInitialData:', signature);
        //     if (signature) {
        //         if (signature.title) {
        //             setInputBoxValue(signature.title);
        //         }
        //         if (signature.favicon) {
        //             if (signature.favicon.type !== EmojiFavicon.type) {
        //                 throw new Error('Only supporting emoji favicons at the moment.');
        //             }
        //             setSelectedEmoji(EmojiFavicon.fromDTO(signature.favicon).emoji);
        //         }
        //     }
        // };
        // loadInitialData();
    }, []);

    useEffect(() => {
        function chromeListener(message, _sender, _sendResponse) {
            if (message.command === COMMAND_OPEN_RENAME_DIALOG) {
                setIsVisible(true);
            }
            // else if (message.command === 'set_tab_signature') {
            //     setDocumentSignature(message.signature);
            // }
        }

        chrome.runtime.onMessage.addListener(chromeListener);

        function domListener(event) {
            if (event.type === COMMAND_OPEN_RENAME_DIALOG) {
                setIsVisible(true);
            }
        }
        document.addEventListener(COMMAND_OPEN_RENAME_DIALOG, domListener);

        return () => {
            chrome.runtime.onMessage.removeListener(chromeListener);
            document.removeEventListener(COMMAND_OPEN_RENAME_DIALOG, domListener);
        };
    });

    // For debugging purposes:
    useEffect(() => {
        const debugFunction = async () => {
            log.debug('storage:', await chrome.storage.sync.get(null));
        };
        document.body.addEventListener('click', debugFunction);

        return () => {
            document.body.removeEventListener('click', debugFunction);
        }
    });

    const handleInputBoxKeydown = async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            log.debug('Enter key pressed', inputBoxValue, selectedEmoji);
            const newDocumentTitle = inputBoxValue === '' ? null : inputBoxValue;
            const newDocumentFavicon = selectedEmoji ? new EmojiFavicon(selectedEmoji).toDTO() : null;
            await tab.setSignature(newDocumentTitle, newDocumentFavicon);
            setIsVisible(false);
        }
    };

    const handleFaviconPickerClick = () => {
        setEmojiPickerIsVisible(!emojiPickerIsVisible);
    }

    const handleEmojiClick = (emoji) => {
        setSelectedEmoji(emoji);
        setEmojiPickerIsVisible(false);
    }

    const handleRemoveEmoji = () => {
        setSelectedEmoji(null);
        setEmojiPickerIsVisible(false);
    }

    useEffect(() => {
        if (isVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isVisible]);

    return (
        <div id={ROOT_ELEMENT_ID} className={styles.root} style={{ display: isVisible ? 'block' : 'none' }}>
            <div id={OVERLAY_ID} className={styles.overlay} onClick={() => {setIsVisible(false)}}></div>
            <div className={styles.mainBar}>
                <div className={styles.faviconPickerWrapper}>
                    <SelectedEmoji selectedEmoji={selectedEmoji} handleFaviconPickerClick={handleFaviconPickerClick}/>
                    <EmojiPicker 
                        onEmojiClick={handleEmojiClick}
                        onRemoveEmoji={handleRemoveEmoji}
                        isVisible={emojiPickerIsVisible}
                    />
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
    );
}
