import { EMOJI_STYLE_DEFAULT, SETTINGS_KEY_EMOJI_STYLE } from "../config";


class StorageSchemaManager {
    currentSchemaVersion = '1.1.0';

    /**
     * Checks for existence of schemaVersion, and migrates the data if necessary.
     * @param {Object} data 
     * @returns {Object} - the migrated data
     */
    verifyCorrectSchemaVersion(data) {
        data = JSON.parse(JSON.stringify(data)); // clone

        if (!data.schemaVersion) {
            data.schemaVersion = "1.0.1" // Defaulting to the first ever schema version.
        }

        // Apply migrations in a sorted order, starting with the lowerst version that 
        // is greater than the current version, and going all the way until the target version.
        if (data.schemaVersion != this.currentSchemaVersion) {
            const migrationVersions = Object.keys(this.migrations).sort();
            for (const version of migrationVersions) {
                if (version > data.schemaVersion && version <= this.currentSchemaVersion) {
                    data = this.migrations[version](data);
                }
            }
        }

        return data;
    }

    migrations = {
        '1.1.0': (data) => {
            for (const key of Object.keys(data)) {
                const item = data[key];
                if (item.signature && item.signature.favicon) {
                    if (item.signature.favicon.type === "emojiFavicon") {
                        item.signature.favicon.type = "systemEmojiFavicon";
                    }
                }
            }
            data[SETTINGS_KEY_EMOJI_STYLE] = EMOJI_STYLE_DEFAULT
            data.schemaVersion = "1.1.0"
            return data;
        }
    }

}

export { StorageSchemaManager };