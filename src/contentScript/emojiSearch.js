import { getLogger } from '../log';

// eslint-disable-next-line no-unused-vars
const log = getLogger('emojiSearch', 'debug');

export const findMatchingEmojis = (searchTerm, emojis) => {
    let allEmojis = [];
    for (const category in emojis) {
        allEmojis = allEmojis.concat(emojis[category]);
    }
    // log.debug('allEmojis:', allEmojis);

    const searchTerms = searchTerm.split(' ');

    const matchesShortcode = allEmojis.filter(emoji => 
        searchTerms.every(term => emoji.shortcode.includes(term))
    );

    const matchesKeywords = allEmojis.filter(emoji => 
        searchTerms.every(term => 
            emoji.keywords.some(keyword => keyword.includes(term))
        )
    ).filter(emoji => !matchesShortcode.includes(emoji));

    return matchesShortcode.concat(matchesKeywords);
};