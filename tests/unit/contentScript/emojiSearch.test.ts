import appRoot from 'app-root-path';
import { findMatchingEmojis } from 'src/contentScript/emojiSearch';
import * as fs from 'fs';

describe('findMatchingEmojis', () => {
    const emojis = JSON.parse(fs.readFileSync(`${appRoot}/src/assets/emojis.json`, 'utf8'));

    const findMatchingEmojiShotcodes = (searchTerm: string, emojis: any) => {
        return findMatchingEmojis(searchTerm, emojis).map(result => result.shortcode);
    }

    const expectEmojiSearchToContain = (searchTerm: string, expectedResults: string[]) => {
        const results = findMatchingEmojiShotcodes(searchTerm, emojis);
        expect(results).toEqual(expect.arrayContaining(expectedResults));
    }

    test('returns single query matches', () => {
        expectEmojiSearchToContain('love', [":love_letter:", ":love_you_gesture:", ":love_hotel:", ":smiling_face_with_hearts:", ":heart_on_fire:", ":two_hearts:", ":couple_with_heart:"]);
        expectEmojiSearchToContain('sweat', [":grinning_face_with_sweat:", ":anxious_face_with_sweat:", ":downcast_face_with_sweat:", ":sweat_droplets:", ":hot_face:", ":droplet:"]);
        expectEmojiSearchToContain('angry', [":angry_face:", ":angry_face_with_horns:", ":enraged_face:", ":anger_symbol:", ":right_anger_bubble:"]);
        expectEmojiSearchToContain('cry', [":crying_face:", ":loudly_crying_face:", ":crying_cat:", ":face_holding_back_tears:"]);
        expectEmojiSearchToContain('smile', [":cat_with_wry_smile:", ":grinning_face_with_big_eyes:", ":grinning_face_with_smiling_eyes:", ":grinning_squinting_face:", ":smiling_face_with_smiling_eyes:"]);
    });

    test('returns multiple query matches', () => {
        expectEmojiSearchToContain('sweat grin', [":grinning_face_with_sweat:"]);
        expectEmojiSearchToContain('evil horns', [":angry_face_with_horns:"]);
    });
});

