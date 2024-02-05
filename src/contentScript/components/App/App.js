import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { setDocumentSignature } from "../../setters";
import { ROOT_ELEMENT_ID, INPUT_BOX_ID, OVERLAY_ID, MAIN_BAR_ID, EVENT_OPEN_RENAME_DIALOG } from '../../../config';
import PropTypes from 'prop-types';
import bgScriptApi from '../../backgroundScriptApi';
import log from "../../../log";
import SelectedEmoji from '../SelectedEmoji';
import EmojiPicker from '../EmojiPicker';
import { TabSignature } from '../../../types';
import { EmojiFavicon, Favicon, UrlFavicon } from '../../../favicon';


export default function App() {
    const [isVisible, setIsVisible] = useState(true);
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    const [inputBoxValue, setInputBoxValue] = useState('');
    const [emojiPickerIsVisible, setEmojiPickerIsVisible] = useState(false);

    /** @type {React.MutableRefObject<string>} */
    const originalTitle = useRef(null);
    
    /** @type {React.MutableRefObject<string>} */
    const originalFavicon = useRef(null);

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
        const loadInitialData = async () => {
            const signature = await bgScriptApi.loadSignature();
            log.debug('retrieved signaturein loadInitialData:', signature);
            if (signature) {
                if (signature.title) {
                    setInputBoxValue(signature.title);
                }
                if (signature.favicon) {
                    if (signature.favicon.type !== EmojiFavicon.type) {
                        throw new Error('Only supporting emoji favicons at the moment.');
                    }
                    setSelectedEmoji(EmojiFavicon.fromDTO(signature.favicon).emoji);
                }
            }
            if (signature && signature.originalTitle) {
                originalTitle.current = signature.originalTitle;
            } else {
                originalTitle.current = document.title;
            }
            if (signature && signature.originalFaviconUrl) {
                originalFavicon.current = signature.originalFaviconUrl;
            } else {
                originalFavicon.current = await bgScriptApi.getFaviconUrl();
            }
            log.debug('originalTitle:', originalTitle.current);
            log.debug('originalFavicon:', originalFavicon.current);
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        function chromeListener(message, _sender, _sendResponse) {
            if (message.command === EVENT_OPEN_RENAME_DIALOG) {
                setIsVisible(true);
            }
            // else if (message.command === 'set_tab_signature') {
            //     setDocumentSignature(message.signature);
            // }
        }

        chrome.runtime.onMessage.addListener(chromeListener);

        function domListener(event) {
            if (event.type === EVENT_OPEN_RENAME_DIALOG) {
                setIsVisible(true);
            }
        }
        document.addEventListener(EVENT_OPEN_RENAME_DIALOG, domListener);

        return () => {
            chrome.runtime.onMessage.removeListener(chromeListener);
            document.removeEventListener(EVENT_OPEN_RENAME_DIALOG, domListener);
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
            log.debug('Enter key pressed', inputBoxValue, selectedEmoji, originalTitle.current, originalFavicon.current);
            const newDocumentTitle = inputBoxValue === '' ? null : inputBoxValue;
            const newDocumentFavicon = selectedEmoji ? new EmojiFavicon(selectedEmoji).toDTO() : null;
            await setDocumentSignature(new TabSignature(
                newDocumentTitle,
                newDocumentFavicon,
                originalTitle.current,
                originalFavicon.current
            ));
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

    return (
        <div id={ROOT_ELEMENT_ID} style={{ display: isVisible ? 'block' : 'none' }}>
            <div id={OVERLAY_ID} onClick={() => {setIsVisible(false)}}></div>
            <div id={MAIN_BAR_ID}>
                <div id="tab-renamer-extension-favicon-picker-wrapper">
                    <SelectedEmoji selectedEmoji={selectedEmoji} handleFaviconPickerClick={handleFaviconPickerClick}/>
                    {emojiPickerIsVisible && 
                        <EmojiPicker onEmojiClick={handleEmojiClick} onRemoveEmoji={handleRemoveEmoji}/>
                    }
                </div>
                <input 
                    type="text"
                    id={INPUT_BOX_ID}
                    placeholder="New Tab Title"
                    autoComplete="off"
                    value={inputBoxValue}
                    onChange={(event) => setInputBoxValue(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={handleInputBoxKeydown}
                />
            </div>
        </div>
    );
}

