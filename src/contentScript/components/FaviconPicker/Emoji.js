import React from 'react';
import { log } from './FaviconPicker';
import PropTypes from 'prop-types';
import * as types from '../../../types';
import styles from './Emoji.module.css';
import { SystemEmojiFavicon, TwemojiFavicon } from '../../../favicon';
import { EMOJI_STYLE_NATIVE, EMOJI_STYLE_TWEMOJI, getEmojiStyle } from '../../../config.js';
// import twemoji from 'twemoji';

/**
 * @param {{emoji: types.Emoji, onClick: Function}} props
 */
export const Emoji = ({ emoji, onClick }) => {
    const strippedShortcode = emoji.shortcode.substring(1, emoji.shortcode.length - 1);

    // ============== Twemoji approach: ==============
    let emojiComponent = null;
    let faviconToReturn = null;
    if (getEmojiStyle() === EMOJI_STYLE_NATIVE) {
        faviconToReturn = new SystemEmojiFavicon(emoji.character);
        emojiComponent = (
            <span className={styles.emojiWrapper}>
                {emoji.character}
            </span>
        );
    } else if (getEmojiStyle() === EMOJI_STYLE_TWEMOJI) {
        faviconToReturn = new TwemojiFavicon(emoji.character);
        emojiComponent = (
            <img 
                className="emoji" 
                draggable="false" 
                alt={emoji.character}
                src={faviconToReturn.getUrl()}
                style={{cursor: 'pointer', width: '24px', height: '24px'}}
            />
        );
    } else {
        log.error('Invalid emoji style:', getEmojiStyle());
    }

    return (
        <div
            className={styles.emojiItem}
            id={emoji.character}
            data-unicode={emoji.unicode_code_point}
            data-shortcode={emoji.shortcode}
            onClick={() => onClick(faviconToReturn)}
            title={strippedShortcode}
        >
            {emojiComponent}
        </div>
    );
};

Emoji.propTypes = {
    emoji: PropTypes.object,
    // emoji: PropTypes.instanceOf(types.Emoji),
    onClick: PropTypes.func.isRequired,
}