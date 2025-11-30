import React from 'react';
import styles from './SelectedFavicon.module.css';
import { EMOJI_PICKER_IMAGE_ID, FAVICON_PICKER_ID, PICKED_EMOJI_ID } from '../../../config';
import { Favicon } from '../../../favicon';

interface SelectedFaviconProps {
    selectedFavicon: Favicon | null;
    handleSelectedFaviconClick: React.MouseEventHandler<HTMLDivElement>;
}

function SelectedFavicon({ selectedFavicon, handleSelectedFaviconClick }: SelectedFaviconProps) {
    const emojiElement = (selectedFavicon ? 
        <img 
            id={PICKED_EMOJI_ID}
            className={styles.selectedImage}
            src={selectedFavicon.getUrl()}
            data-emoji={selectedFavicon.getId()}
        /> :
        <img 
            id={EMOJI_PICKER_IMAGE_ID}
            className={styles.placeholderImage}
            src={chrome.runtime.getURL("assets/emoji_picker_icon.png")}
        />
    );

    return (
        <div id={FAVICON_PICKER_ID} className={styles.root} onClick={handleSelectedFaviconClick}>
            {emojiElement}
        </div>
    );
}

export default SelectedFavicon;

