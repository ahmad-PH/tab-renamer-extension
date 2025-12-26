import React from 'react';
import { log } from './FaviconPicker';
import styles from './Emoji.module.css';
import { SystemEmojiFavicon, TwemojiFavicon, Favicon } from '../../../favicon';
import { EMOJI_STYLE_NATIVE, EMOJI_STYLE_TWEMOJI, getEmojiStyle, platform } from '../../../config';
import { Emoji as EmojiType } from '../../../types';

interface EmojiProps {
    emoji: EmojiType;
    onClick: (favicon: Favicon) => void;
}

export const Emoji: React.FC<EmojiProps> = ({ emoji, onClick }) => {
    const strippedShortcode = emoji.shortcode.substring(1, emoji.shortcode.length - 1);

    let emojiComponent: JSX.Element | null = null;
    let faviconToReturn: Favicon | null = null;
    if (getEmojiStyle() === EMOJI_STYLE_NATIVE) {
        faviconToReturn = new SystemEmojiFavicon(emoji.character);
        const styleObject = platform === 'win' ? {transform: 'translateX(-4.5px)'} : {};
        emojiComponent = (
            <span className={styles.emojiWrapper} style={styleObject}>
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
            data-shortcode={emoji.shortcode}
            data-style={getEmojiStyle()}
            onClick={() => onClick(faviconToReturn!)}
            title={strippedShortcode}
        >
            {emojiComponent}
        </div>
    );
};

