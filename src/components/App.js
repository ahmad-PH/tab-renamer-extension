import React, { useEffect, useState } from 'react';
import EmojiPicker from './EmojiPicker';
import { setTabTitle, setTabFavicon } from '../contentScript';
import { ROOT_ELEMENT_ID, INPUT_BOX_ID, OVERLAY_ID, MAIN_BAR_ID, EVENT_OPEN_RENAME_DIALOG } from '../config';
import PropTypes from 'prop-types';
import bgScriptApi from '../backgroundScriptApi';
import log from "../log";
import SelectedEmoji from './SelectedEmoji';

export function App() {
    const [isVisible, setIsVisible] = useState(true);
    const [selectedEmoji, setSelectedEmoji] = useState(null);
    const [inputBoxValue, setInputBoxValue] = useState('');
    const [emojiPickerIsVisible, setEmojiPickerIsVisible] = useState(false);

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
            if (signature) {
                if (signature.title) {
                    setInputBoxValue(signature.title);
                }
                if (signature.favicon) {
                    setSelectedEmoji(signature.favicon);
                }
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        function chromeListener(message, _sender, _sendResponse) {
            if (message.command === EVENT_OPEN_RENAME_DIALOG) {
                setIsVisible(true);
            } else if (message.command === 'set_tab_signature') {
                setTabTitle(message.signature.title);
                setTabFavicon(message.signature.favicon);
            }
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
            chrome.storage.sync.get(null, (items) => {
                log.debug('storage:');
                log.debug(items);
            });
            log.debug(bgScriptApi.loadSignature());
        };
        document.body.addEventListener('click', debugFunction);

        return () => {
            document.body.removeEventListener('click', debugFunction);
        }
    });

    const handleInputBoxKeydown = async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            log.debug('Setting the tab title to:', inputBoxValue);
            await setTabTitle(inputBoxValue);
            if (selectedEmoji) {
                await setTabFavicon(selectedEmoji);
            }
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

    return (
        <div id={ROOT_ELEMENT_ID} style={{ display: isVisible ? 'block' : 'none' }}>
            <div id={OVERLAY_ID} onClick={() => {setIsVisible(false)}}></div>
            <div id={MAIN_BAR_ID}>
                <div id="tab-renamer-extension-favicon-picker-wrapper">
                    <SelectedEmoji selectedEmoji={selectedEmoji} handleFaviconPickerClick={handleFaviconPickerClick}/>
                    {emojiPickerIsVisible && 
                        <EmojiPicker onEmojiClick={handleEmojiClick}/>
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

