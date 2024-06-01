import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './EmojiPicker.module.css';
import PropTypes from 'prop-types';
import { EMOJI_PICKER_ID, EMOJI_REMOVE_BUTTON_ID, SEARCH_BAR_ID, SEARCH_RESULTS_ID, ALL_EMOJIS_ID } from '../../../config';
import classNames from 'classnames';
import { getLogger } from '../../../log';
import { findMatchingEmojis } from '../../emojiSearch';
import twemoji from 'twemoji';

// eslint-disable-next-line no-unused-vars
const log = getLogger('EmojiPicker', 'debug');

const EmojiPicker = ({ onEmojiClick, onRemoveEmoji }) => {
    const [searchValue, setSearchValue] = useState('');
    const [allEmojis, setAllEmojis] = useState({});
    const [isVisible, setIsVisible] = useState(false);

    const matchingEmojis = useMemo(
        () => findMatchingEmojis(searchValue, allEmojis),
        [searchValue, allEmojis]
    );

    useEffect(() => {
        const loadEmojis = async () => {
            try {
                const response = await fetch(chrome.runtime.getURL('assets/emojis.json'));
                setAllEmojis(await response.json());
            } catch (e) {
                console.error('Error loading emojis:', e);
            }
        };

        loadEmojis();
    }, []);

    const formatEmojiCategoryTitle = (categoryTitle) => {
        return categoryTitle
            .replace(/_/g, ' ')  // Replace underscores with spaces
            .replace(/\band\b/gi, '&')  // Replace 'and' with '&'
            .replace(/\b\w/g, (char) => char.toUpperCase());  // Capitalize first letter of each word
    };

    useEffect(() => {
        setTimeout(() => {
            setIsVisible(true);
        }, 0);
    }, []);

    return (
        <div id={EMOJI_PICKER_ID} className={classNames(styles.root, {[styles.visible]: isVisible})}>
            <div className={styles.headerContainer}>
                <div className={styles.header}>
                    <SearchBar onSearchBarChanged={(searchValue) => setSearchValue(searchValue)} />
                    <button id={EMOJI_REMOVE_BUTTON_ID} onClick={onRemoveEmoji} className={styles.removeButton}>
                        Remove
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                {searchValue === "" ? (
                    <div id={ALL_EMOJIS_ID}>
                        {allEmojis && Object.entries(allEmojis).map(([category, emojis]) => (
                            <div key={category}>
                                <div className={styles.emojiCategoryTitle}>
                                    {formatEmojiCategoryTitle(category)}
                                </div>
                                <div className={styles.emojiGrid}>
                                    {emojis.map(emoji => (
                                        <Emoji emoji={emoji} key={emoji.unicode} onClick={onEmojiClick}/>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div id={SEARCH_RESULTS_ID} className={classNames(styles.searchResults, styles.emojiGrid)}>
                        {matchingEmojis.map(emoji => (
                            <Emoji emoji={emoji} key={emoji.unicode} onClick={onEmojiClick}/>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

EmojiPicker.propTypes = {
    onEmojiClick: PropTypes.func.isRequired,
    onRemoveEmoji: PropTypes.func.isRequired,
}

const SearchBar = ({ onSearchBarChanged }) => {
    const searchBarRef = useRef(null);

    useEffect(() => {
        searchBarRef.current.focus();
    }, []);

    return (
        <input
            id={SEARCH_BAR_ID}
            className={styles.emojiSearchBar}
            ref={searchBarRef}
            type='text'
            placeholder='Search for an emoji'
            onChange={(e) => onSearchBarChanged(e.target.value)}
            autoComplete='off'
        />
    );
}

SearchBar.propTypes = {
    onSearchBarChanged: PropTypes.func.isRequired,
}

const Emoji = ({ emoji, onClick }) => {
    const strippedShortcode = emoji.shortcode.substring(1, emoji.shortcode.length - 1);
    const twemojiImg = twemoji.parse(emoji.emoji);

    log.debug('Twemoji emoji:', twemojiImg, typeof twemojiImg);

    const parseTwemojiOutput = (twemojiOutput) => {
        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(twemojiOutput, 'text/html');
        log.debug('Parsed document:', parsedDoc);

        const imgElement = parsedDoc.querySelector('img');
        log.debug('Image element:', imgElement);


        if (imgElement) {
            log.debug('Image src:', imgElement.src);
            log.debug('Image alt:', imgElement.alt);
            return <img className={styles.emoji} draggable={false} src={imgElement.src} alt={imgElement.alt} />;
        } else {
            log.debug('ImgElement is null:', imgElement);
            return null;
        }

    };
    
    const parseOutput = parseTwemojiOutput(twemojiImg);
    log.debug('Parsed twemoji:', parseOutput);

    return (
        <div 
            className={styles.emojiItem}
            data-unicode={emoji.unicode} 
            data-shortcode={emoji.shortcode}
            onClick={() => onClick(emoji.emoji)}
            title={strippedShortcode}
        >
            <span className={styles.emojiWrapper}>
                {parseOutput}
            {/* <span className={styles.emojiWrapper} dangerouslySetInnerHTML={{ __html: twemojiImg }}> */}
                {/* {emoji.emoji} */}
            </span>
        </div>
    );
}

Emoji.propTypes = {
    emoji: PropTypes.object.isRequired,
    onClick: PropTypes.func.isRequired,
}

export default EmojiPicker;