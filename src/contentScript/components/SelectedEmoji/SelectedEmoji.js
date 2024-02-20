import React from 'react';
import styles from './SelectedEmoji.module.css';
import { emojiToDataURL } from '../../../utils';
import PropTypes from 'prop-types';
import { EMOJI_PICKER_IMAGE_ID, FAVICON_PICKER_ID, PICKED_EMOJI_ID } from '../../../config';
import log from '../../../log';

function SelectedEmoji({ selectedEmoji, handleFaviconPickerClick }) {
    const emojiElement = (selectedEmoji ? 
        <img id={PICKED_EMOJI_ID} className={styles.selectedImage} src={emojiToDataURL(selectedEmoji, 55)} data-emoji={selectedEmoji}/> :
        <img id={EMOJI_PICKER_IMAGE_ID} className={styles.placeholderImage} src={chrome.runtime.getURL("assets/emoji_picker_icon.png")}/>
    );

    return (
        <div id={FAVICON_PICKER_ID} className={styles.root} onClick={handleFaviconPickerClick}>
            {emojiElement}
        </div>
    );
}

SelectedEmoji.propTypes = {
    selectedEmoji: PropTypes.string,
    handleFaviconPickerClick: PropTypes.func.isRequired,
}

export default SelectedEmoji;