import { EMOJI_STYLE_DEFAULT, SETTINGS_KEY_EMOJI_STYLE } from "../config";

type MigrationFunction = (data: any) => any;

class StorageSchemaManager {
    currentSchemaVersion = '1.1.0';

    verifyCorrectSchemaVersion(data: any): any {
        data = JSON.parse(JSON.stringify(data));

        if (!data.schemaVersion) {
            data.schemaVersion = "1.0.1"
        }

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

    migrations: Record<string, MigrationFunction> = {
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

