import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './FaviconPicker.module.css';
import { 
    EMOJI_PICKER_ID,
    EMOJI_REMOVE_BUTTON_ID,
    SEARCH_BAR_ID,
    SEARCH_RESULTS_ID,
    ALL_EMOJIS_ID 
} from '../../../config';
import classNames from 'classnames';
import { getLogger } from '../../../log';
import { findMatchingEmojis } from '../../emojiSearch';
import { Emoji } from './Emoji';
import { Favicon } from '../../../favicon';
import { Emoji as EmojiType } from '../../../types';

export const log = getLogger('EmojiPicker');

interface FaviconPickerProps {
    onFaviconClick: (favicon: Favicon) => void;
    onRemoveEmoji: () => void;
}

const FaviconPicker: React.FC<FaviconPickerProps> = ({ onFaviconClick, onRemoveEmoji }) => {
    const [searchValue, setSearchValue] = useState('');
    const [allEmojis, setAllEmojis] = useState<Record<string, EmojiType[]>>({});
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

    const formatEmojiCategoryTitle = (categoryTitle: string) => {
        return categoryTitle
            .replace(/_/g, ' ')
            .replace(/\band\b/gi, '&')
            .replace(/\b\w/g, (char) => char.toUpperCase());
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
                                        <Emoji emoji={emoji} key={emoji.character} onClick={onFaviconClick}/>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div id={SEARCH_RESULTS_ID} className={classNames(styles.searchResults, styles.emojiGrid)}>
                        {matchingEmojis.map(emoji => (
                            <Emoji emoji={emoji} key={emoji.character} onClick={onFaviconClick}/>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface SearchBarProps {
    onSearchBarChanged: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearchBarChanged }) => {
    const searchBarRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        searchBarRef.current?.focus();
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

export default FaviconPicker;

