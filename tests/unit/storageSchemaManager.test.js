
const { StorageSchemaManager } = require('src/background/storageSchemaManager.js');
const { EMOJI_STYLE_DEFAULT } = require('../../src/config');

describe('storageSchemaManager', () => {
    let schemaManager;

    beforeEach(() => {
        /** @type {StorageSchemaManager} */
        schemaManager = new StorageSchemaManager();
    })

    it('defaults the schema version to 1.0.1', () => {
        schemaManager.currentSchemaVersion = '1.0.1';
        const data = {};
        const migratedData = schemaManager.verifyCorrectSchemaVersion(data);
        expect(migratedData.schemaVersion).toBe('1.0.1');
    })

    it('Migrates from 1.0.1 to 1.1.0', () => {
        const data = examples['1.1.0'].before;
        const migratedData = schemaManager.verifyCorrectSchemaVersion(data);
        expect(migratedData).toEqual(examples['1.1.0'].after);
    })
})

const examples = {
    "1.1.0": {
        "after": {
            "920019340": {
                "closedAt": null,
                "id": 920019340,
                "index": 1,
                "isClosed": false,
                "signature": {
                    "favicon": {
                        "content": "😁",
                        "type": "systemEmojiFavicon"
                    },
                    "title": "testTitle"
                },
                "url": "https://www.google.com/"
            },
            "920019341": {
                "closedAt": null,
                "id": 920019341,
                "index": 2,
                "isClosed": false,
                "signature": {
                    "favicon": null,
                    "title": null
                },
                "url": "https://www.google.com/"
            },
            "settings.emoji_style": EMOJI_STYLE_DEFAULT,
            "schemaVersion": "1.1.0"
        },
        "before": {
            "920019340": {
                "closedAt": null,
                "id": 920019340,
                "index": 1,
                "isClosed": false,
                "signature": {
                    "favicon": {
                        "content": "😁",
                        "type": "emojiFavicon"
                    },
                    "title": "testTitle"
                },
                "url": "https://www.google.com/"
            },
            "920019341": {
                "closedAt": null,
                "id": 920019341,
                "index": 2,
                "isClosed": false,
                "signature": {
                    "favicon": null,
                    "title": null
                },
                "url": "https://www.google.com/"
            }
        }
    }
}


// For the next example:
/*
{
    "920019340": {
        "closedAt": null,
        "id": 920019340,
        "index": 1,
        "isClosed": false,
        "signature": {
            "favicon": null,
            "title": null
        },
        "url": "https://www.google.com/"
    },
    "920019367": {
        "closedAt": null,
        "id": 920019367,
        "index": 2,
        "isClosed": false,
        "signature": {
            "favicon": {
                "content": "😁",
                "type": "systemEmojiFavicon"
            },
            "title": "test2"
        },
        "url": "https://www.google.com/"
    },
    "920019377": {
        "closedAt": null,
        "id": 920019377,
        "index": 3,
        "isClosed": false,
        "signature": {
            "favicon": {
                "content": "😅",
                "type": "twemojiFavicon"
            },
            "title": "twemojiTitle"
        },
        "url": "https://ca.yahoo.com/?p=us"
    },
    "settings.emoji_style": "twemoji"
}
*/