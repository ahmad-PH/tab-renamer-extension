import React from 'react';
import { emojiToDataURL } from '../utils';
import PropTypes from 'prop-types';
import { EMOJI_PICKER_IMAGE_ID, FAVICON_PICKER_ID, PICKED_EMOJI_ID } from '../config';

function SelectedEmoji({ selectedEmoji, handleFaviconPickerClick }) {
    const emojiElement = (selectedEmoji === null ? 
        <img id={EMOJI_PICKER_IMAGE_ID} src={chrome.runtime.getURL("assets/emoji_picker_icon.png")}/> :
        <img id={PICKED_EMOJI_ID} src={emojiToDataURL(selectedEmoji, 55)}/>
    );

    return (
        <div id={FAVICON_PICKER_ID} onClick={handleFaviconPickerClick}>
            {emojiElement}
        </div>
    );
}

SelectedEmoji.propTypes = {
    selectedEmoji: PropTypes.string,
    handleFaviconPickerClick: PropTypes.func.isRequired,
}

export default SelectedEmoji;