describe('config.js', () => {
    describe('Default emoji style', () => {
        beforeEach(() => {
            jest.resetModules(); // To reset utils from being cached.
        });

        it ('should be native on mac', () => {
            jest.mock('../../src/utils', () => ({
                __esModule: true,
                platform: 'mac',
            }));
            const { getEmojiStyle, EMOJI_STYLE_NATIVE } = require('../../src/config');
            expect(getEmojiStyle()).toBe(EMOJI_STYLE_NATIVE);
        });

        it ('should be twemoji on other platforms', () => {
            jest.mock('../../src/utils', () => ({
                __esModule: true,
                platform: 'win',
            }));
            const { getEmojiStyle, EMOJI_STYLE_TWEMOJI } = require('../../src/config');
            expect(getEmojiStyle()).toBe(EMOJI_STYLE_TWEMOJI);
        });
    });
});