import React from 'react';
import styles from './selectedFavicon.module.css';
import PropTypes from 'prop-types';
import { EMOJI_PICKER_IMAGE_ID, FAVICON_PICKER_ID, PICKED_EMOJI_ID } from '../../../config.js';
import log from '../../../log';
import { Favicon } from '../../../favicon';

/**
 * @param {{selectedFavicon: Favicon, handleSelectedFaviconClick: import('react').MouseEventHandler<HTMLDivElement>}} props
 */
function SelectedFavicon({ selectedFavicon, handleSelectedFaviconClick }) {
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

SelectedFavicon.propTypes = {
    selectedFavicon: PropTypes.instanceOf(Favicon),
    handleSelectedFaviconClick: PropTypes.func.isRequired,
}

export default SelectedFavicon;