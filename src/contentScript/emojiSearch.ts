import { getLogger } from '../log';
import { Emoji } from '../types';

const log = getLogger('emojiSearch');

export const findMatchingEmojis = (searchTerm: string, emojis: Record<string, Emoji[]>): Emoji[] => {
    let allEmojis: Emoji[] = [];
    for (const category in emojis) {
        allEmojis = allEmojis.concat(emojis[category]);
    }

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

