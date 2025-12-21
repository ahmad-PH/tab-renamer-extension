import type * as ConfigType from '../../src/config';

describe('config.js', () => {
    describe('Default emoji style', () => {
        beforeEach(() => {
            jest.resetModules();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it ('should be native on mac', () => {
            Object.defineProperty(navigator, 'platform', {
                value: 'MacIntel',
                configurable: true
            });
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                configurable: true
            });
            Object.defineProperty(process, 'platform', {
                value: 'darwin',
                configurable: true
            });
            
            const config = jest.requireActual<typeof ConfigType>('../../src/config');
            expect(config.getEmojiStyle()).toBe(config.EMOJI_STYLE_NATIVE);
        });

        it ('should be twemoji on other platforms', () => {
            Object.defineProperty(navigator, 'platform', {
                value: 'Win32',
                configurable: true
            });
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                configurable: true
            });
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                configurable: true
            });
            
            const config = jest.requireActual<typeof ConfigType>('../../src/config');
            expect(config.getEmojiStyle()).toBe(config.EMOJI_STYLE_TWEMOJI);
        });
    });
});

