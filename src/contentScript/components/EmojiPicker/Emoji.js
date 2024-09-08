import React from 'react';
import { log } from './EmojiPicker';
import PropTypes from 'prop-types';
import * as types from '../../../types';
import styles from './Emoji.module.css';
import { emojiToDataURL } from '../../../utils';
// import twemoji from 'twemoji';

/**
 * @param {{emoji: types.Emoji, onClick: Function}} props
 */
export const Emoji = ({ emoji, onClick }) => {
    const strippedShortcode = emoji.shortcode.substring(1, emoji.shortcode.length - 1);

    // const options = {
    //     base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
    //     size: 72, // This is the only size that exists on twemoji's upload to the CDN.
    // }
    // const twemojiImg = twemoji.parse(emoji.character, options);

    // ============== Twemoji approach: ==============
    const codepoint = emoji.unicode_code_point.replace(/U\+/g, "").replace(/ /g, "-").toLowerCase();
    const url = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/" + codepoint + ".png";
    // log.debug('Emoji URL:', url);

    // ============== Native approach: ==============
    // const dataURL = emojiToDataURL(emoji.character);

    return (
        <div
            className={styles.emojiItem}
            id={emoji.character}
            data-unicode={emoji.unicode_code_point}
            data-shortcode={emoji.shortcode}
            onClick={() => onClick(emoji.character)}
            title={strippedShortcode}
        >
                <img 
                    className="emoji" 
                    draggable="false" 
                    alt={emoji.character}
                    src={url}
                    style={{cursor: 'pointer', width: '24px', height: '24px'}}
                />

                {/* <span className={styles.emojiWrapper}>
                    {emoji.character}
                </span> */}

                {/* <span className={styles.emojiWrapper} dangerouslySetInnerHTML={{ __html: twemojiImg }} /> */}
        </div>
    );
};

Emoji.propTypes = {
    emoji: PropTypes.instanceOf(types.Emoji),
    onClick: PropTypes.func.isRequired,
}