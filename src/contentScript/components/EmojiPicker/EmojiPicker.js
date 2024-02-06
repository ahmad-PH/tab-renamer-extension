import React, { Component, useEffect, useRef } from 'react';
import styles from './EmojiPicker.module.css';
import PropTypes from 'prop-types';
import { EMOJI_PICKER_ID, EMOJI_REMOVE_BUTTON_ID } from '../../../config';
import classNames from 'classnames';

const SEARCH_RESULTS_ID = 'tab-renamer-extension-search-results-div';
const ALL_EMOJIS_ID = 'tab-renamer-extension-all-emojis-div';
const SEARCH_BAR_ID = 'tab-renamer-extension-emoji-search-bar';

/**
 * EmojiPicker component.
 *
 * @component
 * @param {Object} props
 * @param {Function} props.onEmojiClick - Function to call when an emoji is clicked.
 * @returns {React.Component} EmojiPicker component.
 */
class EmojiPicker extends Component {
    constructor(props) {
        super(props);
        this.state = {
            searchValue: '',
            emojis: [],
            allEmojis: null,
        };
    }

    async componentDidMount() {
        try {
            this.setState({allEmojis: await (await fetch(chrome.runtime.getURL('assets/emojis.json'))).json()});
        } catch (e) {
            console.error('Error loading emojis:', e);
        }
    }

    filterEmojis(searchValue) {
        let filteredEmojis = [];
        for (const category in this.state.emojis) {
            filteredEmojis = filteredEmojis.concat(this.state.emojis[category].filter(emoji =>
                emoji.shortcode.includes(searchValue)
            ));
        }
        return filteredEmojis;
    }

    formatEmojiCategoryTitle(categoryTitle) {
        return categoryTitle
            .replace(/_/g, ' ')  // Replace underscores with spaces
            .replace(/\band\b/gi, '&')  // Replace 'and' with '&'
            .replace(/\b\w/g, (char) => char.toUpperCase());  // Capitalize first letter of each word
    }

    render() {
        return (
            <div id={EMOJI_PICKER_ID} className={classNames(styles.root, {[styles.visible]: this.props.isVisible})}>
                <div className={styles.headerContainer}>
                    <div className={styles.header}>
                        <SearchBar onSearchBarChanged={(searchValue) => this.setState({searchValue})} />
                        <button id={EMOJI_REMOVE_BUTTON_ID} onClick={this.props.onRemoveEmoji} className={styles.removeButton}>
                            Remove
                        </button>
                    </div>
                </div>

                <div className={styles.content}>
                    {this.state.searchValue === "" ? (
                        <div id={ALL_EMOJIS_ID}>
                            {this.state.allEmojis && Object.entries(this.state.allEmojis).map(([category, emojis]) => (
                                <div key={category}>
                                    <div className={styles.emojiCategoryTitle}>
                                        {this.formatEmojiCategoryTitle(category)}
                                    </div>
                                    <div className={styles.emojiGrid}>
                                        {emojis.map(emoji => (
                                            <Emoji emoji={emoji} key={emoji.unicode} onClick={
                                                () => this.props.onEmojiClick(emoji.emoji)
                                            }/>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div id={SEARCH_RESULTS_ID} className={classNames(styles.searchResults, styles.emojiGrid)}>
                            {this.state.emojis.map(emoji => (
                                <Emoji emoji={emoji} key={emoji.unicode} onClick={
                                    this.props.onEmojiClick
                                }/>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

EmojiPicker.propTypes = {
    onEmojiClick: PropTypes.func.isRequired,
    onRemoveEmoji: PropTypes.func.isRequired,
    isVisible: PropTypes.bool.isRequired,
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
    return (
        <div 
            className={styles.emojiItem}
            data-unicode={emoji.unicode} 
            data-shortcode={emoji.shortcode}
            onClick={onClick}
        >
            <span className={styles.emojiWrapper}>
                {emoji.emoji}
            </span>
        </div>
    );
}

Emoji.propTypes = {
    emoji: PropTypes.object.isRequired,
    onClick: PropTypes.func.isRequired,
}

export default EmojiPicker;